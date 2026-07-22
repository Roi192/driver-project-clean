import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEV_LABEL: Record<string, string> = { minor: "קל", moderate: "בינוני", severe: "חמור" };
const SEV_EMOJI: Record<string, string> = { minor: "🟡", moderate: "🟠", severe: "🔴" };

const DRIVER_LABEL: Record<string, string> = {
  security:       'נהג בט"ש',
  combat:         "נהג לוחם",
  vehicle_officer:"נהג קצין רכב",
  general:        "נהג כללי",
  fighter:        "נהג לוחם",
  palsar:         'נהג פלס"ם',
  other:          "אחר",
};

function unitName(r: Record<string, string>): string {
  const fw = r.framework_type || "";
  const region = r.region || "";
  if (fw === "planag") {
    return ['מפח"ט בנימין', r.department].filter(Boolean).join(" | ");
  }
  // מגב: stored as "sector:מגב רמה" or "sector:מג"ב רמה" (with geresh)
  if (/מג.?ב/.test(fw) || /מג.?ב/.test(region)) {
    const magavName = fw.startsWith("sector:") ? `גדוד ${fw.replace("sector:", "")}` : fw;
    return [magavName, r.company_name].filter(Boolean).join(" | ");
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

  const vehicleParts = [r.vehicle_type, r.vehicle_model, r.vehicle_number ? `מס' ${r.vehicle_number}` : ""].filter(Boolean);
  const vehicle = vehicleParts.join(" ");
  const driverLabel = DRIVER_LABEL[r.driver_type] || r.driver_type || "";

  const header = r.safety_category
    ? `${SEV_EMOJI[sev] || "🚨"} *אירוע בטיחות חדש — ${r.safety_category}*`
    : `${SEV_EMOJI[sev] || "🚨"} *אירוע בטיחות חדש*`;

  const lines: string[] = [
    header,
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
    `🫂 *סוג אוכלוסייה:* ${r.population_type || ""}`,
    `🚘 *סוג הרכב:* ${vehicle}`,
    `🎯 *סיווג האירוע (סוג פעילות היחידה):* ${r.unit_activity_type || ""}`,
    `⚡ *חומרת האירוע:* ${SEV_LABEL[sev] || sev}`,
    `⚖️ *סיווג האשמה:* ${r.culpability || ""}`,
    `💥 *נזק ונפגעים:* ${r.damage_and_casualties || ""}`,
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
  imageSignedUrls: string[],
): Promise<void> {
  // 1. Main text message
  await fetch(`${base}/sendMessage/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  // 2. Images (send each one individually)
  for (let i = 0; i < imageSignedUrls.length; i++) {
    const url = imageSignedUrls[i];
    const fileName = `image_${i + 1}.jpg`;
    const caption = imageSignedUrls.length > 1 ? `תמונה ${i + 1} מתוך ${imageSignedUrls.length}` : "תמונת האירוע";
    const imgRes = await fetch(`${base}/sendFileByUrl/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, urlFile: url, fileName, caption }),
    });
    const imgBody = await imgRes.text();
    console.log(`sendFileByUrl [${i + 1}] status=${imgRes.status} body=${imgBody}`);
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

    // Build list of image paths — prefer image_urls (JSON array), fallback to legacy image_url
    const rawImagePaths: string[] = [];
    if (record.image_urls) {
      try {
        const parsed = JSON.parse(record.image_urls);
        if (Array.isArray(parsed)) rawImagePaths.push(...parsed.filter(Boolean));
      } catch { /* not JSON */ }
    }
    if (rawImagePaths.length === 0 && record.image_url) {
      rawImagePaths.push(record.image_url);
    }

    // Generate signed URLs (1 hour) for all images so Green API can access private storage
    const imageSignedUrls: string[] = [];
    for (const path of rawImagePaths) {
      if (path.startsWith("http")) {
        imageSignedUrls.push(path);
      } else {
        const { data: signed } = await supabase.storage
          .from("content-images")
          .createSignedUrl(path, 3600);
        if (signed?.signedUrl) imageSignedUrls.push(signed.signedUrl);
      }
    }
    console.log(`Images: ${rawImagePaths.length} paths → ${imageSignedUrls.length} signed URLs`);

    const message = buildMessage(record);
    const BASE = `https://api.green-api.com/waInstance${cfg.instance_id}`;
    const TOKEN = cfg.api_token;

    let sent = 0, failed = 0;
    for (const g of recipients) {
      try {
        await sendToGroup(BASE, TOKEN, g.wa_id, record, message, imageSignedUrls);
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
