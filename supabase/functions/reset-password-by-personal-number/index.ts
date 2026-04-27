import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, personalNumber, newPassword } = await req.json();

    if (!email || !personalNumber || !newPassword) {
      return new Response(
        JSON.stringify({ error: "חסרים שדות חובה" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "סיסמה חייבת להכיל לפחות 8 תווים" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    if (!(hasUpper && hasLower && hasNum)) {
      return new Response(
        JSON.stringify({ error: "סיסמה חייבת להכיל אותיות גדולות, קטנות ומספרים" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPN = String(personalNumber).trim();

    // Find user by email by paginating through auth users
    let foundUser: { id: string; email?: string } | null = null;
    let page = 1;
    const perPage = 1000;
    while (!foundUser) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const match = data.users.find(
        (u) => (u.email || "").toLowerCase() === normalizedEmail
      );
      if (match) {
        foundUser = { id: match.id, email: match.email };
        break;
      }
      if (data.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    if (!foundUser) {
      return new Response(
        JSON.stringify({ success: false, error: "פרטים שגויים" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify personal number against profile
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("personal_number")
      .eq("user_id", foundUser.id)
      .maybeSingle();

    if (profErr) throw profErr;

    if (!profile?.personal_number || String(profile.personal_number).trim() !== normalizedPN) {
      return new Response(
        JSON.stringify({ success: false, error: "פרטים שגויים" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password
    const { error: updateErr } = await admin.auth.admin.updateUserById(foundUser.id, {
      password: newPassword,
    });

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("reset-password-by-personal-number error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});