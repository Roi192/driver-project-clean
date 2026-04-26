import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cleaning parade days configuration
const CLEANING_DAYS = [
  { value: "monday", label: "יום שני", dayOfWeek: 1, sourceDay: 0, sourceShift: "afternoon" },
  { value: "wednesday", label: "יום רביעי", dayOfWeek: 3, sourceDay: 2, sourceShift: "afternoon" },
  { value: "saturday_night", label: "מוצאי שבת", dayOfWeek: 6, sourceDay: 6, sourceShift: "morning" },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in Israel timezone
    const now = new Date();
    const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    const currentDayOfWeek = israelTime.getDay();
    const currentHour = israelTime.getHours();

    console.log(`Current Israel time: ${israelTime.toISOString()}, Day: ${currentDayOfWeek}, Hour: ${currentHour}`);

    // Find if today is a cleaning day (send notification at 8 AM)
    const cleaningDay = CLEANING_DAYS.find(d => d.dayOfWeek === currentDayOfWeek);
    
    if (!cleaningDay) {
      console.log("Today is not a cleaning day");
      return new Response(
        JSON.stringify({ message: "Not a cleaning day" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Send at 8 AM
    if (currentHour < 8 || currentHour > 8) {
      console.log("Not notification time (8 AM)");
      return new Response(
        JSON.stringify({ message: "Not notification time" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get week start (Sunday)
    const weekStart = new Date(israelTime);
    weekStart.setDate(israelTime.getDate() - currentDayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const today = israelTime.toISOString().split("T")[0];

    console.log(`Processing cleaning notifications for ${cleaningDay.label}, week: ${weekStartStr}`);

    // Get manual assignments for this day/week
    const { data: manualAssignments } = await supabase
      .from('cleaning_manual_assignments')
      .select('soldier_id, outpost')
      .eq('day_of_week', cleaningDay.value)
      .eq('week_start_date', weekStartStr);

    // Get work schedule for source day
    const { data: workSchedule } = await supabase
      .from('work_schedule')
      .select('outpost, morning_soldier_id, afternoon_soldier_id')
      .eq('day_of_week', cleaningDay.sourceDay)
      .eq('week_start_date', weekStartStr);

    // Build list of soldiers to notify
    const soldiersToNotify: Map<string, { outpost: string }> = new Map();

    // Add manual assignments
    manualAssignments?.forEach(a => {
      soldiersToNotify.set(a.soldier_id, { outpost: a.outpost });
    });

    // Add from work schedule (if not manually overridden)
    workSchedule?.forEach(ws => {
      const soldierId = cleaningDay.sourceShift === "afternoon" 
        ? ws.afternoon_soldier_id 
        : ws.morning_soldier_id;
      
      if (soldierId) {
        // Check if there's a manual assignment for this outpost
        const hasManual = manualAssignments?.some(m => m.outpost === ws.outpost);
        if (!hasManual) {
          soldiersToNotify.set(soldierId, { outpost: ws.outpost });
        }
      }
    });

    console.log(`Found ${soldiersToNotify.size} soldiers to notify`);

    const notifications: Array<{ success: boolean; soldier: string; error?: string }> = [];

    for (const [soldierId, { outpost }] of soldiersToNotify) {
      try {
        // Check if already notified today
        const { data: existing } = await supabase
          .from('cleaning_notifications_log')
          .select('id')
          .eq('soldier_id', soldierId)
          .eq('day_of_week', cleaningDay.value)
          .eq('week_start_date', weekStartStr)
          .eq('notification_type', 'reminder')
          .maybeSingle();

        if (existing) {
          console.log(`Already notified soldier ${soldierId}`);
          continue;
        }

        // Get soldier info
        const { data: soldier } = await supabase
          .from('soldiers')
          .select('id, full_name, personal_number')
          .eq('id', soldierId)
          .single();

        if (!soldier) continue;

        // Get profile with push subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('personal_number', soldier.personal_number)
          .maybeSingle();

        if (!profile?.user_id) {
          console.log(`No profile for soldier ${soldier.full_name}`);
          continue;
        }

        // Get push subscriptions
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', profile.user_id);

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No push subscription for ${soldier.full_name}`);
          continue;
        }

        // Send push notification to each subscription
        for (const sub of subscriptions) {
          try {
            const payload = JSON.stringify({
              title: "מסדר ניקיון היום! 🧹",
              body: `יש לך מסדר ניקיון ב${outpost} - ${cleaningDay.label}`,
              url: `/cleaning-parades?day=${cleaningDay.value}&outpost=${encodeURIComponent(outpost)}`,
            });

            // Note: In production, you'd use web-push library here
            // For now, we'll just log it and save to the log
            console.log(`Would send push to ${soldier.full_name}: ${payload}`);
          } catch (pushError) {
            console.error(`Push error for ${soldier.full_name}:`, pushError);
          }
        }

        // Log the notification
        await supabase.from('cleaning_notifications_log').insert({
          soldier_id: soldierId,
          outpost,
          day_of_week: cleaningDay.value,
          week_start_date: weekStartStr,
          notification_type: 'reminder',
        });

        notifications.push({ success: true, soldier: soldier.full_name });
        console.log(`Notification logged for ${soldier.full_name}`);
      } catch (error) {
        console.error(`Error notifying soldier ${soldierId}:`, error);
        notifications.push({ success: false, soldier: soldierId, error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`,
        day: cleaningDay.label,
        results: notifications 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-cleaning-notifications:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});