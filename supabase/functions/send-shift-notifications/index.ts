import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shift times in Israel timezone (UTC+2/3)
const SHIFTS = {
  morning: { hour: 6, minute: 0, label: "בוקר" },
  afternoon: { hour: 14, minute: 0, label: "צהריים" },
  evening: { hour: 22, minute: 0, label: "ערב" },
};

const NOTIFICATION_MINUTES_BEFORE = 15;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a test mode request
    const body = await req.json().catch(() => ({}));
    
    if (body.testMode) {
      // Manual test SMS - send immediately to specified soldier
      const { soldierId, soldierName, phone, outpost, shiftType } = body;
      
      if (!phone) {
        return new Response(
          JSON.stringify({ error: "No phone number provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const message = `שלום ${soldierName}, זוהי הודעת בדיקה ממערכת סידור העבודה. המשמרת שלך ב${outpost} (${shiftType}).`;
      
      // Format phone number
      let phoneNumber = phone.replace(/\D/g, "");
      if (phoneNumber.startsWith("0")) {
        phoneNumber = "+972" + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith("+")) {
        phoneNumber = "+972" + phoneNumber;
      }

      // Send SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const formData = new URLSearchParams();
      formData.append("To", phoneNumber);
      formData.append("From", twilioPhoneNumber);
      formData.append("Body", message);

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const twilioResult = await twilioResponse.json();
      
      if (twilioResponse.ok) {
        console.log(`Test SMS sent to ${soldierName} (${phoneNumber})`);
        
        // Log the test notification
        await supabase.from("sms_notifications_log").insert({
          soldier_id: soldierId,
          soldier_name: soldierName,
          phone: phoneNumber,
          shift_type: "test",
          outpost: outpost,
          shift_date: new Date().toISOString().split("T")[0],
          status: "sent",
        });

        return new Response(
          JSON.stringify({ success: true, message: "Test SMS sent successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        console.error(`Failed to send test SMS:`, twilioResult);
        return new Response(
          JSON.stringify({ error: twilioResult.message || "Failed to send SMS" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // Regular scheduled notification logic
    // Get current time in Israel timezone
    const now = new Date();
    const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    const currentHour = israelTime.getHours();
    const currentMinute = israelTime.getMinutes();
    const currentDayOfWeek = israelTime.getDay(); // 0 = Sunday

    // Get the start of the current week (Sunday)
    const weekStart = new Date(israelTime);
    weekStart.setDate(israelTime.getDate() - currentDayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const today = israelTime.toISOString().split("T")[0];

    console.log(`Current Israel time: ${israelTime.toISOString()}`);
    console.log(`Hour: ${currentHour}, Minute: ${currentMinute}, Day: ${currentDayOfWeek}`);
    console.log(`Week start: ${weekStartStr}`);

    const notifications: Array<{
      soldierId: string;
      soldierName: string;
      phone: string;
      shiftType: string;
      outpost: string;
    }> = [];

    // Check each shift
    for (const [shiftKey, shiftInfo] of Object.entries(SHIFTS)) {
      // Calculate the notification time (15 minutes before shift starts)
      const notifyHour = shiftInfo.hour === 0 ? 23 : 
                         shiftInfo.minute < NOTIFICATION_MINUTES_BEFORE ? shiftInfo.hour - 1 : shiftInfo.hour;
      const notifyMinute = shiftInfo.minute < NOTIFICATION_MINUTES_BEFORE ? 
                           60 - NOTIFICATION_MINUTES_BEFORE + shiftInfo.minute : 
                           shiftInfo.minute - NOTIFICATION_MINUTES_BEFORE;

      // Check if we're within the notification window (allow 5 minute buffer)
      const isNotificationTime = 
        currentHour === notifyHour && 
        currentMinute >= notifyMinute && 
        currentMinute < notifyMinute + 5;

      if (!isNotificationTime) {
        console.log(`Not notification time for ${shiftKey} shift (notify at ${notifyHour}:${notifyMinute})`);
        continue;
      }

      console.log(`Processing ${shiftKey} shift notifications`);

      // Get today's schedule for all outposts
      const soldierIdColumn = `${shiftKey}_soldier_id`;
      const { data: schedules, error: scheduleError } = await supabase
        .from("work_schedule")
        .select("id, outpost, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("week_start_date", weekStartStr)
        .eq("day_of_week", currentDayOfWeek);

      if (scheduleError) {
        console.error("Error fetching schedules:", scheduleError);
        continue;
      }

      // Filter schedules that have a soldier assigned for this shift
      const relevantSchedules = (schedules || []).filter((s: any) => s[soldierIdColumn] != null);
      console.log(`Found ${relevantSchedules.length} schedules for ${shiftKey}`);

      for (const schedule of relevantSchedules) {
        const soldierId = (schedule as any)[soldierIdColumn];
        if (!soldierId) continue;

        // Check if notification was already sent today for this soldier and shift
        const { data: existingNotification } = await supabase
          .from("sms_notifications_log")
          .select("id")
          .eq("soldier_id", soldierId)
          .eq("shift_type", shiftKey)
          .eq("shift_date", today)
          .single();

        if (existingNotification) {
          console.log(`Notification already sent to soldier ${soldierId} for ${shiftKey} today`);
          continue;
        }

        // Get soldier info
        const { data: soldier, error: soldierError } = await supabase
          .from("soldiers")
          .select("id, full_name, phone")
          .eq("id", soldierId)
          .single();

        if (soldierError || !soldier) {
          console.error(`Error fetching soldier ${soldierId}:`, soldierError);
          continue;
        }

        if (!soldier.phone) {
          console.log(`Soldier ${soldier.full_name} has no phone number`);
          continue;
        }

        notifications.push({
          soldierId: soldier.id,
          soldierName: soldier.full_name,
          phone: soldier.phone,
          shiftType: shiftKey,
          outpost: (schedule as any).outpost,
        });
      }
    }

    console.log(`Sending ${notifications.length} notifications`);

    // Send SMS notifications
    const results = [];
    for (const notification of notifications) {
      const message = `שלום ${notification.soldierName}, המשמרת שלך ב${notification.outpost} מתחילה בעוד 15 דקות. אנא מלא את טופס לפני משמרת באפליקציה.`;

      try {
        // Format phone number (assuming Israeli numbers)
        let phoneNumber = notification.phone.replace(/\D/g, "");
        if (phoneNumber.startsWith("0")) {
          phoneNumber = "+972" + phoneNumber.substring(1);
        } else if (!phoneNumber.startsWith("+")) {
          phoneNumber = "+972" + phoneNumber;
        }

        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const formData = new URLSearchParams();
        formData.append("To", phoneNumber);
        formData.append("From", twilioPhoneNumber);
        formData.append("Body", message);

        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const twilioResult = await twilioResponse.json();
        
        if (twilioResponse.ok) {
          console.log(`SMS sent to ${notification.soldierName} (${phoneNumber})`);
          
          // Log successful notification
          await supabase.from("sms_notifications_log").insert({
            soldier_id: notification.soldierId,
            soldier_name: notification.soldierName,
            phone: phoneNumber,
            shift_type: notification.shiftType,
            outpost: notification.outpost,
            shift_date: new Date().toISOString().split("T")[0],
            status: "sent",
          });

          results.push({ success: true, soldier: notification.soldierName });
        } else {
          console.error(`Failed to send SMS to ${notification.soldierName}:`, twilioResult);
          
          // Log failed notification
          await supabase.from("sms_notifications_log").insert({
            soldier_id: notification.soldierId,
            soldier_name: notification.soldierName,
            phone: phoneNumber,
            shift_type: notification.shiftType,
            outpost: notification.outpost,
            shift_date: new Date().toISOString().split("T")[0],
            status: "failed",
            error_message: twilioResult.message || "Unknown error",
          });

          results.push({ success: false, soldier: notification.soldierName, error: twilioResult.message });
        }
      } catch (error) {
        console.error(`Error sending SMS to ${notification.soldierName}:`, error);
        results.push({ success: false, soldier: notification.soldierName, error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`,
        results 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in send-shift-notifications:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});