import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEV_LABEL: Record<string, string> = { minor: "קל", moderate: "בינוני", severe: "חמור" };
const SEV_EMOJI: Record<string, string> = { minor: "🟡", moderate: "🟠", severe: "🔴" };

const DRIVER_LABEL: Record<string, string> = {
  security:       'נהג בט"ש',
  combat:         "נהג גדוד",
  vehicle_officer:"נהג קצין רכב",
  general:        "נהג כללי",
  fighter:        "נהג לוחם",
  palsar:         'נהג פלס"ם',
  other:          "אחר",
};

function unitName(r: Record<string, string>): string {
  const fw = r.framework_type || "";
  if (fw === "planag") {
    return ['מפח"ט בנימין', r.department].filter(Boolean).join(" | ");
  }
  if (fw.includes("מגב")) {
    return [fw, r.company_name].filter(Boolean).join(" | ");
  }
  // גדוד [שם הגדוד] | פלוגה [שם הפלוגה]
  const batPart = r.battalion_name ? `גדוד ${r.battalion_name}` : "";
  const compPart = r.company_name ? `פלוגה ${r.company_name}` : "";
  return [batPart, compPart].filter(Boolean).join(" | ") || fw;
}

function buildMessage(r: Record<string, string>): string {
  const sev = r.severity || "minor";
  const dateStr = r.event_date
    ? new Date(r.event_date + "T12:00:00Z").toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("he-IL");

  const vehicle = [r.vehicle_type, r.vehicle_number ? `מס' ${r.vehicle_number}` : ""].filter(Boolean).join(" ");
  const driverLabel = DRIVER_LABEL[r.driver_type] || r.driver_type || "";

  const lines: string[] = [
    `${SEV_EMOJI[sev] || "🚨"} *אירוע בטיחות חדש*`,
    "",
    `📋 *דיווח ראשוני:* ${r.title || ""}`,
    `🪖 *שם היחידה:* ${unitName(r)}`,
    `📅 *תאריך:* ${dateStr}`,
    `⏰ *שעה:* ${r.event_time || ""}`,
    `📍 *מיקום האירוע:* ${r.location_text || ""}`,
    `👥 *חיילים מעורבים:* ${r.involved_soldiers || ""}`,
    `📝 *תיאור האירוע:* ${r.description || ""}`,
    `📊 *תוצאות האירוע:* ${r.event_outcomes || ""}`,
    `🩺 *הערכת מצב חומרת בפגיעה באדם ורכוש:* ${r.person_injury_severity || ""}`,
    `👤 *סוג הנהג:* ${driverLabel}`,
    `🚘 *סוג הרכב:* ${vehicle}`,
    `🎯 *סיווג האירוע (סוג פעילות היחידה):* ${r.unit_activity_type || ""}`,
    `⚡ *חומרת האירוע:* ${SEV_LABEL[sev] || sev}`,
    `💡 *לקחים ראשונים:* ${r.initial_lessons || ""}`,
    "",
    "_הוזן דרך מערכת נהגים_ ✅",
  ];

  return lines.join("\n");
}

async function sendToGroup(
  base: string,
  token: string,
  chatId: string,
  record: Record<string, string>,
  message: string,
  imageSignedUrl: string | null,
): Promise<void> {
  // 1. Main text message
  await fetch(`${base}/sendMessage/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  // 2. Image (use signed URL so Green API can access private storage)
  if (imageSignedUrl) {
    const fileName = (record.image_url || "image").split("/").pop() || "image.jpg";
    const imgRes = await fetch(`${base}/sendFileByUrl/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, urlFile: imageSignedUrl, fileName, caption: "תמונת האירוע" }),
    });
    const imgBody = await imgRes.text();
    console.log(`sendFileByUrl status=${imgRes.status} body=${imgBody}`);
  }

  // 3. GPS location pin
  if (record.latitude && record.longitude) {
    await fetch(`${base}/sendLocation/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        nameLocation: record.title || "מיקום האירוע",
        address: record.location_text || "",
        latitude: parseFloat(record.latitude),
        longitude: parseFloat(record.longitude),
      }),
    });
  }
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

    const { data: cfg } = await supabase
      .from("whatsapp_config")
      .select("instance_id, api_token, is_enabled")
      .single();

    if (!cfg?.is_enabled || !cfg?.instance_id || !cfg?.api_token) {
      console.log("WhatsApp not configured or disabled — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const { data: allGroups } = await supabase
      .from("whatsapp_groups")
      .select("wa_id, name, is_global, battalion_name")
      .eq("is_active", true);

    if (!allGroups?.length) {
      console.log("No active WhatsApp groups — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const eventBattalion = record.battalion_name || null;
    const recipients = allGroups.filter(g =>
      g.is_global ||
      (g.battalion_name && g.battalion_name === eventBattalion)
    );

    if (!recipients.length) {
      console.log("No matching groups for this event — skipping");
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // Generate a signed URL for the image (1 hour) so Green API can access private storage
    let imageSignedUrl: string | null = null;
    if (record.image_url) {
      if (record.image_url.startsWith("http")) {
        imageSignedUrl = record.image_url;
      } else {
        const { data: signed } = await supabase.storage
          .from("content-images")
          .createSignedUrl(record.image_url, 3600);
        imageSignedUrl = signed?.signedUrl ?? null;
      }
      console.log("image_url path:", record.image_url, "→ signed:", imageSignedUrl);
    }

    const message = buildMessage(record);
    const BASE = `https://api.green-api.com/waInstance${cfg.instance_id}`;
    const TOKEN = cfg.api_token;

    let sent = 0, failed = 0;
    for (const g of recipients) {
      try {
        await sendToGroup(BASE, TOKEN, g.wa_id, record, message, imageSignedUrl);
        sent++;
      } catch (e) {
        console.error(`Failed sending to ${g.name}:`, e);
        failed++;
      }
    }
    console.log(`WhatsApp: sent=${sent} to [${recipients.map(g => g.name).join(", ")}], failed=${failed}`);

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-safety-whatsapp error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
