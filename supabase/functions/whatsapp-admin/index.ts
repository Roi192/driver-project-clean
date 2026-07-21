import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const { action, ...body } = await req.json();

    // Read Green API credentials
    const { data: cfg } = await supabase
      .from("whatsapp_config")
      .select("instance_id, api_token, is_enabled")
      .single();

    if (action === "get-config") {
      return json({
        instanceId: cfg?.instance_id || "",
        isEnabled: cfg?.is_enabled ?? true,
        hasToken: !!cfg?.api_token,
      });
    }

    if (action === "save-config") {
      const { instanceId, apiToken, isEnabled } = body;
      await supabase
        .from("whatsapp_config")
        .update({ instance_id: instanceId, api_token: apiToken, is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq("id", "00000000-0000-0000-0000-000000000099");
      return json({ success: true });
    }

    if (!cfg?.instance_id || !cfg?.api_token) {
      return json({ error: "Green API לא מוגדר" }, 400);
    }

    const BASE  = `https://api.green-api.com/waInstance${cfg.instance_id}`;
    const TOKEN = cfg.api_token;

    if (action === "get-groups") {
      const resp = await fetch(`${BASE}/getChats/${TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!resp.ok) return json({ error: `Green API error: ${resp.status}` }, 502);
      const chats = await resp.json();
      const groups = (Array.isArray(chats) ? chats : [])
        .filter((c: any) => typeof c.id === "string" && c.id.endsWith("@g.us"))
        .map((c: any) => ({ wa_id: c.id, name: c.name || c.id }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, "he"));
      return json({ groups });
    }

    if (action === "send-test") {
      const { wa_id } = body;
      if (!wa_id) return json({ error: "חסר wa_id" }, 400);
      const resp = await fetch(`${BASE}/sendMessage/${TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: wa_id,
          message: "✅ *בדיקת מערכת*\n\nהודעה זו נשלחה בהצלחה ממערכת הנהגים.\nאירועי בטיחות ישלחו לקבוצה זו אוטומטית.",
        }),
      });
      const result = await resp.json();
      if (!resp.ok) return json({ error: result }, 502);
      return json({ success: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
