import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEV_EMOJI: Record<string, string> = { minor:"🟡", moderate:"🟠", severe:"🔴" };

const FW_LABEL: Record<string, string> = {
  planag: 'פלנ"ג',
  "sector:צפונית": "גזרה צפונית",
  "sector:דרומית": "גזרה דרומית",
  battalion: "גדוד",
};

function fw(r: Record<string, string>): string {
  const parts: string[] = [];
  const fwRaw = r.framework_type || "";
  const fwLabel = FW_LABEL[fwRaw] || fwRaw;
  if (fwLabel) parts.push(fwLabel);
  if (r.department) parts.push(r.department);
  if (r.battalion_name) parts.push(r.battalion_name);
  if (r.company_name) parts.push(`פלוגה ${r.company_name}`);
  return parts.join(" | ");
}

function buildMessage(r: Record<string, string>): string {
  const sev  = r.severity || "minor";
  const dateStr = r.event_date
    ? new Date(r.event_date + "T12:00:00Z").toLocaleDateString("he-IL", { day:"2-digit", month:"2-digit", year:"numeric" })
    : new Date().toLocaleDateString("he-IL");
  const timeStr = r.event_time || "";
  const dateTime = timeStr ? `${dateStr} שעה ${timeStr}` : dateStr;

  const framework = fw(r);
  const loc = [r.outpost, r.region, r.sector].filter(Boolean).join(" | ");

  const lines: string[] = [
    `${SEV_EMOJI[sev] || "🟡"} *דיווח אירוע בטיחות*`,
    "",
    `📅 *תאריך ושעה:* ${dateTime}`,
  ];

  if (framework) lines.push(`🪖 *מסגרת:* ${framework}`);
  if (loc)        lines.push(`📍 *מיקום:* ${loc}`);

  if (r.involved_soldiers) lines.push(`👥 *חיילים מעורבים:* ${r.involved_soldiers}`);

  lines.push("", `📝 *תיאור האירוע:*`);
  if (r.title)       lines.push(r.title);
  if (r.description) lines.push(r.description);

  if (r.event_outcomes) {
    lines.push("", `📊 *תוצאות האירוע:* ${r.event_outcomes}`);
  }

  if (r.person_injury_severity) lines.push(`🩺 *חומרת פגיעה באדם:* ${r.person_injury_severity}`);
  if (r.property_damage_severity) lines.push(`🔧 *חומרת פגיעה ברכוש:* ${r.property_damage_severity}`);

  const vehicleParts: string[] = [];
  if (r.vehicle_type)   vehicleParts.push(r.vehicle_type);
  if (r.vehicle_number) vehicleParts.push(`מס' ${r.vehicle_number}`);
  if (vehicleParts.length) lines.push(`🚘 *רכב:* ${vehicleParts.join(" ")}`);

  const driverParts: string[] = [];
  if (r.driver_type === "security") {
    driverParts.push("נהג בט\"ש");
  } else if (r.driver_type === "combat") {
    driverParts.push("נהג לוחם");
  } else if (r.driver_type) {
    driverParts.push(r.driver_type);
  }
  if (r.driver_name) driverParts.push(r.driver_name);
  if (driverParts.length) lines.push(`👤 *נהג:* ${driverParts.join(" — ")}`);

  if (r.unit_activity_type) lines.push(`🎯 *פעילות היחידה:* ${r.unit_activity_type}`);

  if (r.initial_lessons) {
    lines.push("", `💡 *לקחים ראשונים:* ${r.initial_lessons}`);
  }

  lines.push("", "_הוזן דרך מערכת הנהגים_ ✅");
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
