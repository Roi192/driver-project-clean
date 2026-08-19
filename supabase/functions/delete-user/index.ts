import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders } from '../_shared/cors.ts'

// ─── helpers ────────────────────────────────────────────────────────────────

const log = (step: string, data?: Record<string, unknown>) => {
  const entry: Record<string, unknown> = { step: `[DeleteUser] ${step}` }
  if (data) Object.assign(entry, data)
  console.log(JSON.stringify(entry))
}

const errResponse = (
  corsHeaders: Record<string, string>,
  status: number,
  error: string,
  detail?: string
) => {
  log('error', { status, error, detail: detail ?? null })
  return new Response(
    JSON.stringify({ success: false, error }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ─── main handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  log('request_received', { method: req.method, origin: origin ?? '(none)' })

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // ── 1. Verify caller JWT ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errResponse(corsHeaders, 401, 'UNAUTHENTICATED', 'Missing Authorization header')
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !callerUser) {
      return errResponse(corsHeaders, 401, 'UNAUTHENTICATED', authError?.message)
    }
    log('caller_identified', { caller_id: callerUser.id })

    // ── 2. Load caller's roles + brigade (admin client bypasses RLS) ────────
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const [rolesRes, callerProfileRes] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', callerUser.id),
      supabaseAdmin.from('profiles').select('brigade').eq('user_id', callerUser.id).maybeSingle(),
    ])

    if (rolesRes.error) {
      return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `role fetch: ${rolesRes.error.message}`)
    }

    const roles = rolesRes.data ?? []
    const callerBrigade: string | null = callerProfileRes.data?.brigade ?? null

    const isSuperAdmin   = roles.some((r: { role: string }) => r.role === 'super_admin')
    const isDivisionAdmin = roles.some((r: { role: string }) => r.role === 'division_admin')
    const isAdmin        = roles.some((r: { role: string }) => r.role === 'admin')
    const isBrigadeAdmin = roles.some((r: { role: string }) => r.role === 'brigade_admin')

    log('actor_loaded', {
      roles: roles.map((r: { role: string }) => r.role),
      brigade: callerBrigade,
      isSuperAdmin, isDivisionAdmin, isAdmin, isBrigadeAdmin,
    })

    // ── 3. Check caller is authorised to delete anyone ──────────────────────
    if (!isSuperAdmin && !isDivisionAdmin && !isAdmin && !isBrigadeAdmin) {
      return errResponse(corsHeaders, 403, 'FORBIDDEN', 'caller role does not permit deletion')
    }

    // ── 4. Parse + validate request body ───────────────────────────────────
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'invalid or missing JSON body')
    }
    const { targetUserId } = body as { targetUserId?: unknown }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'targetUserId must be a valid UUID')
    }
    if (targetUserId === callerUser.id) {
      return errResponse(corsHeaders, 400, 'Cannot delete your own account')
    }

    log('target_identified', { target_id: targetUserId })

    // ── 5. Load target's profile ────────────────────────────────────────────
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('brigade, personal_number, full_name')
      .eq('user_id', targetUserId)
      .maybeSingle()

    const targetBrigade: string | null = targetProfile?.brigade ?? null
    log('target_profile_loaded', {
      found: !!targetProfile,
      brigade: targetBrigade,
      has_personal_number: !!targetProfile?.personal_number,
    })

    // ── 6. Brigade-level authorisation ─────────────────────────────────────
    // super_admin: unrestricted
    // division_admin: only brigade = 'division'
    // admin / brigade_admin: must match caller's brigade
    if (!isSuperAdmin) {
      if (isDivisionAdmin) {
        if (targetBrigade !== 'division') {
          return errResponse(corsHeaders, 403, 'FORBIDDEN: division_admin can only delete division users')
        }
      } else {
        if (!callerBrigade || !targetBrigade || callerBrigade !== targetBrigade) {
          return errResponse(
            corsHeaders, 403,
            'FORBIDDEN: cannot delete users from a different brigade',
            `caller_brigade=${callerBrigade} target_brigade=${targetBrigade}`
          )
        }
      }
    }
    log('authorization_passed')

    // ── 7. Pre-deletion cleanup ─────────────────────────────────────────────
    log('cleanup_started')
    const cleanupWarnings: string[] = []

    // 7a. Soft-delete the profile (preserve historical identity)
    //     user_id will become NULL automatically when auth.admin.deleteUser fires
    //     (migration 20260819000005 changed the FK to SET NULL)
    const profileSoftDel = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
    if (profileSoftDel.error) {
      cleanupWarnings.push(`profile soft-delete: ${profileSoftDel.error.message}`)
    }
    log('profile_soft_deleted', { warning: profileSoftDel.error?.message ?? null })

    // 7b. Mark soldier as inactive (NOT deleted) so all historical data is preserved:
    //     event_attendance, punishments, inspections, monthly_safety_scores, etc.
    if (targetProfile?.personal_number) {
      const soldierInactive = await supabaseAdmin
        .from('soldiers')
        .update({ is_active: false })
        .eq('personal_number', targetProfile.personal_number)
      if (soldierInactive.error) {
        cleanupWarnings.push(`soldier inactive: ${soldierInactive.error.message}`)
      }
      log('soldier_marked_inactive', {
        personal_number: targetProfile.personal_number,
        warning: soldierInactive.error?.message ?? null,
      })
    } else {
      log('soldier_skip', { reason: 'no personal_number on profile' })
    }

    // 7c. Delete user_roles (removes all access grants)
    const rolesDel = await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId)
    if (rolesDel.error) cleanupWarnings.push(`user_roles: ${rolesDel.error.message}`)
    log('user_roles_deleted', { warning: rolesDel.error?.message ?? null })

    // 7d. Null out exit_requests decided_by / created_by
    //     (belt+suspenders — migration 20260819000001 added SET NULL FK)
    const [exitDec, exitCre] = await Promise.all([
      supabaseAdmin.from('exit_requests').update({ decided_by: null }).eq('decided_by', targetUserId),
      supabaseAdmin.from('exit_requests').update({ created_by: null }).eq('created_by', targetUserId),
    ])
    if (exitDec.error) cleanupWarnings.push(`exit_requests.decided_by: ${exitDec.error.message}`)
    if (exitCre.error) cleanupWarnings.push(`exit_requests.created_by: ${exitCre.error.message}`)

    // 7e. Delete push subscriptions (migration 20260819000006 adds CASCADE FK,
    //     but we delete explicitly for belt+suspenders)
    const pushDel = await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', targetUserId)
    if (pushDel.error) cleanupWarnings.push(`push_subscriptions: ${pushDel.error.message}`)
    log('push_subscriptions_deleted', { warning: pushDel.error?.message ?? null })

    log('cleanup_finished', { warnings: cleanupWarnings })

    // ── 8. Delete auth user ─────────────────────────────────────────────────
    //   This triggers:
    //     - profiles.user_id → SET NULL  (FK from migration 20260819000005)
    //     - user_roles rows already deleted above
    //     - commander_weekly_schedule CASCADE (acceptable — schedule is not permanent)
    //     - shift_reports.user_id → SET NULL (per existing migration 20260505092117)
    //     - all other SET NULL FKs on auth.users(id)
    log('auth_delete_started', { target_id: targetUserId })
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      const detail = [deleteError.message, ...cleanupWarnings].filter(Boolean).join(' | ')
      log('auth_delete_failed', { error: deleteError.message, cleanup_warnings: cleanupWarnings })
      return new Response(
        JSON.stringify({ success: false, error: `מחיקת המשתמש נכשלה: ${detail}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    log('success', {
      target_id: targetUserId,
      cleanup_warnings: cleanupWarnings,
    })

    return new Response(
      JSON.stringify({
        success: true,
        warnings: cleanupWarnings.length > 0 ? cleanupWarnings : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log('unexpected_error', { error: msg })
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR', detail: msg }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    )
  }
})
