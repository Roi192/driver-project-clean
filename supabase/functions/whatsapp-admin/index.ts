import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const KNOWN_BRIGADES = ["binyamin", "menashe", "efraim", "shomron", "etzion", "yehuda"];

serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const { action, brigade: requestedBrigade, ...rest } = body;

    // ── Verify caller ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    const callerRole = roleRow?.role as string | undefined;
    const isSuperAdmin = callerRole === "super_admin";
    const isAdmin = callerRole === "admin" || callerRole === "brigade_admin";
    if (!isSuperAdmin && !isAdmin) return json({ error: "Forbidden" }, 403);

    // ── Resolve brigade ──────────────────────────────────────────────────────
    // super_admin may pass any brigade; all others use their own profile brigade
    let brigade: string;
    if (isSuperAdmin && requestedBrigade && KNOWN_BRIGADES.includes(requestedBrigade)) {
      brigade = requestedBrigade;
    } else {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("brigade")
        .eq("user_id", caller.id)
        .single();
      brigade = profile?.brigade || requestedBrigade || "binyamin";
    }

    // ── Read config for this brigade ─────────────────────────────────────────
    const { data: cfg } = await serviceClient
      .from("whatsapp_config")
      .select("instance_id, api_token, is_enabled")
      .eq("brigade", brigade)
      .maybeSingle();

    if (action === "get-config") {
      return json({
        instanceId: cfg?.instance_id || "",
        isEnabled: cfg?.is_enabled ?? true,
        hasToken: !!cfg?.api_token,
      });
    }

    if (action === "save-config") {
      const { instanceId, apiToken, isEnabled } = rest;
      const upsertData: Record<string, unknown> = {
        brigade,
        instance_id: instanceId,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      };
      if (apiToken) upsertData.api_token = apiToken;

      const { error } = await serviceClient
        .from("whatsapp_config")
        .upsert(upsertData, { onConflict: "brigade", ignoreDuplicates: false });
      if (error) throw error;
      return json({ success: true });
    }

    if (!cfg?.instance_id || !cfg?.api_token) {
      return json({ error: "Green API לא מוגדר עבור חטיבה זו" }, 400);
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
        .filter((c: { id?: string }) => typeof c.id === "string" && c.id.endsWith("@g.us"))
        .map((c: { id: string; name?: string }) => ({ wa_id: c.id, name: c.name || c.id }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "he"));
      return json({ groups });
    }

    if (action === "send-test") {
      const { wa_id } = rest;
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
