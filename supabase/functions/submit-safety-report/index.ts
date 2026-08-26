import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const KNOWN_BRIGADES = ["binyamin", "menashe", "efraim", "shomron", "etzion", "yehuda"];
const KNOWN_SEVERITIES = ["minor", "moderate", "severe"];
const KNOWN_FRAMEWORK_TYPES = ["planag", "battalion", "maphatch", "other"];

function trunc(v: unknown, max: number): string | null {
  if (!v || typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const title = trunc(body.title, 200);
  const description = trunc(body.description, 5000);
  const event_date = typeof body.event_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.event_date)
    ? body.event_date
    : null;
  const brigade = typeof body.brigade === "string" && KNOWN_BRIGADES.includes(body.brigade)
    ? body.brigade
    : null;
  const severity = typeof body.severity === "string" && KNOWN_SEVERITIES.includes(body.severity)
    ? body.severity
    : "minor";

  if (!title || !description || !event_date || !brigade) {
    return new Response(
      JSON.stringify({ error: "שדות חובה חסרים: כותרת, תיאור, תאריך, חטיבה" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Upload images (base64 → storage)
  const images = Array.isArray(body.images) ? (body.images as unknown[]).slice(0, 3) : [];
  const uploadedPaths: string[] = [];
  for (const img of images) {
    if (!img || typeof img !== "object") continue;
    const { base64, name, type } = img as { base64?: string; name?: string; type?: string };
    if (!base64 || !base64.includes(",")) continue;
    try {
      const data = base64.split(",")[1];
      const bytes = atob(data);
      const byteArr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) byteArr[i] = bytes.charCodeAt(i);
      const ext = (name || "image.jpg").split(".").pop() || "jpg";
      const path = `public-reports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("content-images")
        .upload(path, byteArr, { contentType: type || "image/jpeg", upsert: false });
      if (!uploadErr) uploadedPaths.push(path);
      else console.error("Image upload error:", uploadErr);
    } catch (e) {
      console.error("Image processing error:", e);
    }
  }

  const framework_type = typeof body.framework_type === "string" && KNOWN_FRAMEWORK_TYPES.includes(body.framework_type)
    ? body.framework_type
    : null;

  const reporterName = trunc(body.reporter_name, 100);
  const reporterPhone = trunc(body.reporter_phone, 20);
  const initial_lessons = reporterName
    ? `דווח על ידי: ${reporterName}${reporterPhone ? `, טל: ${reporterPhone}` : ""}`
    : null;

  const record = {
    category: "sector_events",
    title,
    description,
    event_date,
    event_time: trunc(body.event_time, 10),
    brigade,
    severity,
    location_text: trunc(body.location_text, 500),
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
    framework_type,
    department: trunc(body.department, 100),
    battalion_name: trunc(body.battalion_name, 100),
    company_name: trunc(body.company_name, 100),
    driver_name: trunc(body.driver_name, 100),
    vehicle_number: trunc(body.vehicle_number, 50),
    vehicle_type: trunc(body.vehicle_type, 100),
    involved_soldiers: trunc(body.involved_soldiers, 500),
    safety_category: trunc(body.safety_category, 100),
    image_urls: uploadedPaths.length > 0 ? JSON.stringify(uploadedPaths) : null,
    initial_lessons,
  };

  const { data, error } = await supabase
    .from("safety_content")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    console.error("DB insert error:", error);
    return new Response(
      JSON.stringify({ error: "שגיאה בשמירת האירוע. נסה שוב." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, id: data.id }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
};

serve(handler);
