import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  // אפשר גם "*", אבל עדיף לשים את הדומיין שלך
  "Access-Control-Allow-Origin": "https://driver-project.vercel.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server env not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // לקוח אדמין (service_role)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // מביא את כל המשתמשים מה־Auth
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("listUsers error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // map: user_id -> email
    const emailMap: Record<string, string> = {};
    for (const user of data.users) {
      if (user.email) {
        emailMap[user.id] = user.email;
      }
    }

    return new Response(JSON.stringify({ emailMap }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error in get-user-emails:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
