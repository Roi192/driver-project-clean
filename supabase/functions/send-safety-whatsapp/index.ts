import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BAILEYS_URL = Deno.env.get("BAILEYS_SERVICE_URL")!;
const BAILEYS_API_KEY = Deno.env.get("BAILEYS_API_KEY")!;
const WHATSAPP_GROUP_ID = Deno.env.get("WHATSAPP_GROUP_ID")!;

const CATEGORY: Record<string, string> = {
  flag_investigations: "חקירת דגל 🚩",
  sector_events: "אירוע גזרה",
  neighbor_events: "אירוע שכנים",
  monthly_summaries: "סיכום חודשי",
};

const EVENT_TYPE: Record<string, string> = {
  accident: "תאונה",
  stuck: "תקיעה",
  rollover: "התהפכות",
  other: "אחר",
};

const SEVERITY_LABEL: Record<string, string> = {
  minor: "קל",
  moderate: "בינוני",
  severe: "חמור",
};

const SEVERITY_EMOJI: Record<string, string> = {
  minor: "🟡",
  moderate: "🟠",
  severe: "🔴",
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const record = await req.json();
    if (!record?.id) {
      return new Response("Invalid payload", { status: 400 });
    }

    if (!BAILEYS_URL || !BAILEYS_API_KEY || !WHATSAPP_GROUP_ID) {
      console.error("Missing env vars: BAILEYS_SERVICE_URL / BAILEYS_API_KEY / WHATSAPP_GROUP_ID");
      return new Response("Server misconfiguration", { status: 500 });
    }

    const sev = record.severity || "minor";
    const sevEmoji = SEVERITY_EMOJI[sev] || "🟡";
    const catLabel = CATEGORY[record.category] || record.category || "";
    const typeLabel = record.event_type ? EVENT_TYPE[record.event_type] || record.event_type : null;
    const sevLabel = SEVERITY_LABEL[sev] || sev;

    const dateStr = record.event_date
      ? new Date(record.event_date + "T12:00:00Z").toLocaleDateString("he-IL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : new Date().toLocaleDateString("he-IL");

    const lines: string[] = [];
    lines.push(`${sevEmoji} *אירוע בטיחות חדש*`);
    lines.push("");
    lines.push(`📋 *קטגוריה:* ${catLabel}`);
    if (typeLabel) lines.push(`🚗 *סוג:* ${typeLabel}`);
    lines.push(`📅 *תאריך:* ${dateStr}`);
    lines.push(`⚡ *חומרה:* ${sevLabel}`);

    const location = [record.sector, record.region, record.outpost].filter(Boolean).join(" | ");
    if (location) lines.push(`📍 *מיקום:* ${location}`);
    if (record.driver_name) lines.push(`👤 *נהג:* ${record.driver_name}`);
    if (record.vehicle_number) lines.push(`🚘 *רכב:* ${record.vehicle_number}`);
    if (record.battalion_name) lines.push(`🪖 *גדוד:* ${record.battalion_name}`);

    lines.push("");
    lines.push(`*${record.title}*`);
    if (record.description) lines.push(record.description);
    lines.push("");
    lines.push("_הוזן דרך מערכת הנהגים_ ✅");

    const message = lines.join("\n");

    const resp = await fetch(`${BAILEYS_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BAILEYS_API_KEY,
      },
      body: JSON.stringify({ groupId: WHATSAPP_GROUP_ID, message }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Baileys error:", err);
      return new Response(JSON.stringify({ error: err }), { status: 502 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
