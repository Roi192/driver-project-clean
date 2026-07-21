import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CATEGORY: Record<string, string> = {
  flag_investigations: "חקירת דגל 🚩",
  sector_events:       "אירוע גזרה",
  neighbor_events:     "אירוע שכנים",
  monthly_summaries:   "סיכום חודשי",
};
const EVENT_TYPE: Record<string, string> = { accident:"תאונה", stuck:"תקיעה", rollover:"התהפכות", other:"אחר" };
const SEV_LABEL:  Record<string, string> = { minor:"קל", moderate:"בינוני", severe:"חמור" };
const SEV_EMOJI:  Record<string, string> = { minor:"🟡", moderate:"🟠", severe:"🔴" };

function buildMessage(r: Record<string, any>): string {
  const sev  = r.severity || "minor";
  const date = r.event_date
    ? new Date(r.event_date + "T12:00:00Z").toLocaleDateString("he-IL", { day:"2-digit", month:"2-digit", year:"numeric" })
    : new Date().toLocaleDateString("he-IL");
  const loc  = [r.sector, r.region, r.outpost].filter(Boolean).join(" | ");

  const lines = [
    `${SEV_EMOJI[sev] || "🟡"} *אירוע בטיחות חדש*`,
    "",
    `📋 *קטגוריה:* ${CATEGORY[r.category] || r.category}`,
  ];
  if (r.event_type)    lines.push(`🚗 *סוג:* ${EVENT_TYPE[r.event_type] || r.event_type}`);
  lines.push(`📅 *תאריך:* ${date}`);
  lines.push(`⚡ *חומרה:* ${SEV_LABEL[sev] || sev}`);
  if (loc)              lines.push(`📍 *מיקום:* ${loc}`);
  if (r.driver_name)    lines.push(`👤 *נהג:* ${r.driver_name}`);
  if (r.vehicle_number) lines.push(`🚘 *רכב:* ${r.vehicle_number}`);
  if (r.battalion_name) lines.push(`🪖 *גדוד:* ${r.battalion_name}`);
  lines.push("", `*${r.title}*`);
  if (r.description)    lines.push(r.description);
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

    // Fetch active distribution groups
    const { data: groups } = await supabase
      .from("whatsapp_groups")
      .select("wa_id, name")
      .eq("is_active", true);

    if (!groups?.length) {
      console.log("No active WhatsApp groups — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const message = buildMessage(record);
    const BASE    = `https://api.green-api.com/waInstance${cfg.instance_id}`;
    const TOKEN   = cfg.api_token;

    const results = await Promise.allSettled(
      groups.map((g) =>
        fetch(`${BASE}/sendMessage/${TOKEN}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: g.wa_id, message }),
        })
      )
    );

    const sent   = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(`WhatsApp: sent=${sent}, failed=${failed}`);

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-safety-whatsapp error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
