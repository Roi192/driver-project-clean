import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEV_LABEL: Record<string, string> = { minor: "קל", moderate: "בינוני", severe: "חמור" };
const DRIVER_LABEL: Record<string, string> = { security: 'נהג בט"ש', combat: "נהג לוחם" };

// Build the unit name line per the reporting format:
// - planag          → מפח"ט בנימין + department
// - contains "מגב"  → keep framework name + company_name
// - battalion/other → battalion_name only + company_name (omit brigade-level label)
function unitName(r: Record<string, string>): string {
  const fw = r.framework_type || "";
  if (fw === "planag") {
    return ['מפח"ט בנימין', r.department].filter(Boolean).join(" | ");
  }
  if (fw.includes("מגב")) {
    return [fw, r.company_name].filter(Boolean).join(" | ");
  }
  // battalion / sector — show only the battalion name and company
  return [r.battalion_name, r.company_name].filter(Boolean).join(" | ") || fw;
}

function buildMessage(r: Record<string, string>): string {
  const dateStr = r.event_date
    ? new Date(r.event_date + "T12:00:00Z").toLocaleDateString("he-IL", { day:"2-digit", month:"2-digit", year:"numeric" })
    : new Date().toLocaleDateString("he-IL");

  const mapLink = (r.latitude && r.longitude)
    ? `https://maps.google.com/?q=${r.latitude},${r.longitude}`
    : "";

  const injurySevLine = r.person_injury_severity || "";

  const vehicle = [r.vehicle_type, r.vehicle_number ? `מס' ${r.vehicle_number}` : ""].filter(Boolean).join(" ");
  const driverType = DRIVER_LABEL[r.driver_type] || r.driver_type || "";
  const driver = [driverType, r.driver_name].filter(Boolean).join(" — ");

  const lines: string[] = [
    `*דיווח ראשוני:* ${r.title || ""}`,
    `*שם היחידה:* ${unitName(r)}`,
    `*תאריך:* ${dateStr}`,
    `*שעה:* ${r.event_time || ""}`,
    `*מיקום האירוע:* ${mapLink}`,
    `*חיילים מעורבים:* ${r.involved_soldiers || ""}`,
    `*תיאור האירוע:* ${r.description || ""}`,
    `*תוצאות האירוע:* ${r.event_outcomes || ""}`,
    `*הערכת מצב חומרת בפגיעה באדם ורכוש:* ${injurySevLine}`,
    `*סוג הנהג:* ${driver}`,
    `*סוג הרכב:* ${vehicle}`,
    `*סיווג האירוע (סוג פעילות היחידה):* ${r.unit_activity_type || ""}`,
    `*חומרת האירוע:* ${SEV_LABEL[r.severity] || r.severity || ""}`,
    `*לקחים ראשונים:* ${r.initial_lessons || ""}`,
    `*תמונות:* ${r.image_url || ""}`,
  ];

  return lines.join("\n");
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const record = await req.json();
    if (!record?.id) return new Response("Invalid payload", { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read Green API credentials
    const { data: cfg } = await supabase
      .from("whatsapp_config")
      .select("instance_id, api_token, is_enabled")
      .single();

    if (!cfg?.is_enabled || !cfg?.instance_id || !cfg?.api_token) {
      console.log("WhatsApp not configured or disabled — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // Fetch all active groups
    const { data: allGroups } = await supabase
      .from("whatsapp_groups")
      .select("wa_id, name, is_global, battalion_name")
      .eq("is_active", true);

    if (!allGroups?.length) {
      console.log("No active WhatsApp groups — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // Route: brigade groups (is_global=true) always receive everything
    //        battalion groups receive only when battalion_name matches
    const eventBattalion = record.battalion_name || null;
    const recipients = allGroups.filter(g =>
      g.is_global ||
      (g.battalion_name && g.battalion_name === eventBattalion)
    );

    if (!recipients.length) {
      console.log("No matching groups for this event — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const message = buildMessage(record);
    const BASE    = `https://api.green-api.com/waInstance${cfg.instance_id}`;
    const TOKEN   = cfg.api_token;

    const results = await Promise.allSettled(
      recipients.map((g) =>
        fetch(`${BASE}/sendMessage/${TOKEN}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: g.wa_id, message }),
        })
      )
    );

    const sent   = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(`WhatsApp: sent=${sent} to [${recipients.map(g=>g.name).join(", ")}], failed=${failed}`);

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-safety-whatsapp error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
