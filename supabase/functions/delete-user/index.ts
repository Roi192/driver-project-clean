import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHENTICATED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller's identity with their own JWT (anon key + bearer token)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHENTICATED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client for privileged operations (never exposed to client)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Read caller's roles and profile (using admin client to bypass RLS)
    const [rolesRes, callerProfileRes] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', callerUser.id),
      supabaseAdmin.from('profiles').select('brigade').eq('user_id', callerUser.id).maybeSingle(),
    ])

    const roles = rolesRes.data ?? []
    const callerBrigade: string | null = callerProfileRes.data?.brigade ?? null

    const isSuperAdmin = roles.some((r: { role: string }) => r.role === 'super_admin')
    const isDivisionAdmin = roles.some((r: { role: string }) => r.role === 'division_admin')
    const isAdmin = roles.some((r: { role: string }) => r.role === 'admin')
    const isBrigadeAdmin = roles.some((r: { role: string }) => r.role === 'brigade_admin')

    // Only super_admin, division_admin, admin, and brigade_admin (brigade-scoped) may delete users
    if (!isSuperAdmin && !isDivisionAdmin && !isAdmin && !isBrigadeAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'FORBIDDEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate body
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'BAD_REQUEST: invalid body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { targetUserId } = body as { targetUserId?: unknown }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'BAD_REQUEST: targetUserId must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUserId === callerUser.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch target user's profile for brigade authorization check
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('brigade, personal_number')
      .eq('user_id', targetUserId)
      .maybeSingle()

    const targetBrigade: string | null = targetProfile?.brigade ?? null

    // ─── Brigade-level authorization ───────────────────────────────────────
    // super_admin: can delete anyone
    // division_admin: can delete users whose brigade = 'division'
    // admin: can only delete users in their own brigade
    // ───────────────────────────────────────────────────────────────────────
    if (!isSuperAdmin) {
      if (isDivisionAdmin) {
        if (targetBrigade !== 'division') {
          return new Response(
            JSON.stringify({ success: false, error: 'FORBIDDEN: division_admin can only delete division users' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // admin / brigade_admin: must be same brigade
        if (!callerBrigade || !targetBrigade || callerBrigade !== targetBrigade) {
          return new Response(
            JSON.stringify({ success: false, error: 'FORBIDDEN: cannot delete users from a different brigade' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ─── Pre-deletion cleanup ──────────────────────────────────────────────
    // Null out FK references that have no ON DELETE clause so auth.admin.deleteUser
    // doesn't fail with a foreign-key violation.
    const cleanupErrors: string[] = []

    // exit_requests.decided_by / created_by (nullable, no cascade)
    const [exitDecidedRes, exitCreatedRes] = await Promise.all([
      supabaseAdmin.from('exit_requests').update({ decided_by: null }).eq('decided_by', targetUserId),
      supabaseAdmin.from('exit_requests').update({ created_by: null }).eq('created_by', targetUserId),
    ])
    if (exitDecidedRes.error) cleanupErrors.push(`exit_requests.decided_by: ${exitDecidedRes.error.message}`)
    if (exitCreatedRes.error) cleanupErrors.push(`exit_requests.created_by: ${exitCreatedRes.error.message}`)

    // Delete the soldier record matching this user's personal_number (optional link)
    if (targetProfile?.personal_number) {
      const soldierDel = await supabaseAdmin
        .from('soldiers')
        .delete()
        .eq('personal_number', targetProfile.personal_number)
      if (soldierDel.error) cleanupErrors.push(`soldiers: ${soldierDel.error.message}`)
    }

    // Remove user_roles and profile rows explicitly so cascading is predictable
    const rolesDel = await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId)
    if (rolesDel.error) cleanupErrors.push(`user_roles: ${rolesDel.error.message}`)
    const profilesDel = await supabaseAdmin.from('profiles').delete().eq('user_id', targetUserId)
    if (profilesDel.error) cleanupErrors.push(`profiles: ${profilesDel.error.message}`)

    // ─── Delete from Supabase Auth ─────────────────────────────────────────
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    if (deleteError) {
      console.error('auth.admin.deleteUser failed:', deleteError, 'cleanup errors:', cleanupErrors)
      const detail = [deleteError.message, ...cleanupErrors].filter(Boolean).join(' | ')
      return new Response(
        JSON.stringify({ success: false, error: `מחיקת המשתמש נכשלה: ${detail}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (cleanupErrors.length > 0) {
      console.warn('User deleted but with cleanup warnings:', cleanupErrors)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Unexpected error in delete-user:', error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
