import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getUserDomain, getAssignableRoles, type UserDomain } from '../_shared/rolePermissions.ts'

// ── helpers ───────────────────────────────────────────────────────────────────

const log = (step: string, data?: Record<string, unknown>) => {
  const entry: Record<string, unknown> = { step: `[UpdateUser] ${step}` }
  if (data) Object.assign(entry, data)
  console.log(JSON.stringify(entry))
}

const errResponse = (
  corsHeaders: Record<string, string>,
  status: number,
  error: string,
  detail?: string,
) => {
  log('error', { status, error, detail: detail ?? null })
  return new Response(
    JSON.stringify({ success: false, error }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ── main handler ──────────────────────────────────────────────────────────────

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

    // ── 1. Verify caller JWT ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errResponse(corsHeaders, 401, 'UNAUTHENTICATED', 'Missing Authorization header')
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !callerUser) {
      return errResponse(corsHeaders, 401, 'UNAUTHENTICATED', authError?.message)
    }
    log('caller_identified', { caller_id: callerUser.id })

    // ── 2. Load caller role + profile (service role bypasses RLS) ────────────
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [callerRoleRes, callerProfileRes] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', callerUser.id).single(),
      supabaseAdmin.from('profiles').select('brigade, department').eq('user_id', callerUser.id).maybeSingle(),
    ])

    if (callerRoleRes.error || !callerRoleRes.data) {
      return errResponse(corsHeaders, 403, 'FORBIDDEN', 'Could not load caller role')
    }

    const callerRole: string = callerRoleRes.data.role
    const callerBrigade: string | null = callerProfileRes.data?.brigade ?? null
    const callerDept: string | null = callerProfileRes.data?.department ?? null

    // ── 3. Authorize caller role ─────────────────────────────────────────────
    const ALLOWED_CALLER_ROLES = [
      'admin', 'super_admin', 'ravshatz', 'division_admin',
      'maphatch_admin', 'brigade_admin', 'platoon_commander',
    ]
    if (!ALLOWED_CALLER_ROLES.includes(callerRole)) {
      return errResponse(corsHeaders, 403, 'FORBIDDEN', `Role '${callerRole}' cannot manage users`)
    }

    const isSuperAdmin    = callerRole === 'super_admin'
    const isDivisionAdmin = callerRole === 'division_admin'
    const isMaphatchAdmin = callerRole === 'maphatch_admin'
    const isRavshatz      = callerRole === 'ravshatz'

    log('actor_loaded', { callerRole, callerBrigade, callerDept })

    // ── 4. Parse + validate request body ─────────────────────────────────────
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'Invalid or missing JSON body')
    }

    const { targetUserId, displayName, newRole, profileUpdates } = body as {
      targetUserId?: unknown
      displayName?: unknown
      newRole?: unknown
      profileUpdates?: unknown
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'targetUserId must be a valid UUID')
    }
    if (targetUserId === callerUser.id) {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'Cannot modify your own account via this endpoint')
    }
    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.length > 200)) {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'displayName must be a string up to 200 characters')
    }

    const VALID_ROLES = [
      'driver', 'admin', 'super_admin', 'battalion_admin', 'platoon_commander',
      'division_admin', 'division_user', 'ravshatz', 'maphatch_user', 'maphatch_admin', 'brigade_admin',
    ]
    if (newRole !== undefined && (typeof newRole !== 'string' || !VALID_ROLES.includes(newRole))) {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', `'${newRole}' is not a recognized role`)
    }

    log('request_parsed', { targetUserId, newRole, hasProfile: profileUpdates !== undefined })

    // ── 5. Load target profile ────────────────────────────────────────────────
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('brigade, user_type, department, battalion_name')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetErr) {
      return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `Failed to load target profile: ${targetErr.message}`)
    }

    const targetBrigade: string | null = targetProfile?.brigade ?? null
    const targetUserType: string | null = targetProfile?.user_type ?? null
    const targetDept: string | null = targetProfile?.department ?? null
    const targetDomain: UserDomain = getUserDomain(targetUserType)

    log('target_loaded', { targetUserId, targetBrigade, targetUserType, targetDomain, targetDept })

    // ── 6. Brigade authorization ──────────────────────────────────────────────
    // super_admin / ravshatz: unrestricted
    // division_admin: only brigade = 'division'
    // all others: must match caller's brigade
    if (!isSuperAdmin && !isRavshatz) {
      if (isDivisionAdmin) {
        if (targetBrigade !== 'division') {
          return errResponse(corsHeaders, 403, 'FORBIDDEN', 'division_admin can only manage division users')
        }
      } else {
        if (!callerBrigade || !targetBrigade || callerBrigade !== targetBrigade) {
          return errResponse(
            corsHeaders, 403,
            'FORBIDDEN: cannot manage users from a different brigade',
            `caller_brigade=${callerBrigade} target_brigade=${targetBrigade}`,
          )
        }
      }
    }

    // ── 7. Department authorization (maphatch_admin) ──────────────────────────
    // maphatch_admin can only manage: maphatch users in their own department, OR battalion users
    if (isMaphatchAdmin) {
      if (targetDomain !== 'maphatch' && targetDomain !== 'battalion') {
        return errResponse(
          corsHeaders, 403, 'FORBIDDEN',
          'maphatch_admin can only manage maphatch or battalion users',
        )
      }
      // For maphatch users: department must also match
      if (targetDomain === 'maphatch' && (!callerDept || callerDept !== targetDept)) {
        return errResponse(
          corsHeaders, 403, 'FORBIDDEN',
          'maphatch_admin can only manage users in their own department',
        )
      }
    }

    // ── 8. Role assignment authorization ─────────────────────────────────────
    if (newRole !== undefined) {
      const assignable = getAssignableRoles(callerRole, targetDomain)
      if (!assignable.includes(newRole)) {
        return errResponse(
          corsHeaders, 403,
          'FORBIDDEN',
          `Role '${callerRole}' cannot assign '${newRole}' to a ${targetDomain} domain user`,
        )
      }
      log('role_assignment_authorized', { callerRole, targetDomain, newRole })
    }

    log('authorization_passed')

    // ── 9. Validate profileUpdates shape ─────────────────────────────────────
    if (profileUpdates !== undefined &&
        (profileUpdates === null || typeof profileUpdates !== 'object' || Array.isArray(profileUpdates))) {
      return errResponse(corsHeaders, 400, 'BAD_REQUEST', 'profileUpdates must be an object')
    }

    const updates: Record<string, boolean> = {}

    // ── 10. Profile update ────────────────────────────────────────────────────
    if (profileUpdates !== undefined || displayName !== undefined) {
      const profilePayload: Record<string, unknown> = {
        ...(profileUpdates as Record<string, unknown> ?? {}),
      }
      if (displayName !== undefined) profilePayload.full_name = displayName

      if (Object.keys(profilePayload).length > 0) {
        const { data: existingProfile, error: existingErr } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', targetUserId)
          .maybeSingle()

        if (existingErr) {
          return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `Failed to check profile: ${existingErr.message}`)
        }

        if (existingProfile) {
          const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update(profilePayload)
            .eq('user_id', targetUserId)
          if (profileUpdateError) {
            return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `Failed to update profile: ${profileUpdateError.message}`)
          }
        } else {
          const { error: insertErr } = await supabaseAdmin
            .from('profiles')
            .insert({ user_id: targetUserId, ...profilePayload })
          if (insertErr) {
            return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `Failed to create profile: ${insertErr.message}`)
          }
        }
        updates.profileUpdated = true
      }
    }

    // ── 11. Sync auth user_metadata ───────────────────────────────────────────
    if (displayName !== undefined || profileUpdates !== undefined) {
      const meta: Record<string, unknown> = {}
      if (displayName !== undefined) meta.full_name = displayName
      const ALLOWED_META_KEYS = [
        'outpost', 'region', 'military_role', 'platoon', 'personal_number',
        'battalion_name', 'department', 'user_type', 'settlement', 'id_number', 'brigade',
      ]
      if (profileUpdates && typeof profileUpdates === 'object') {
        for (const k of ALLOWED_META_KEYS) {
          if (k in (profileUpdates as object)) {
            meta[k] = (profileUpdates as Record<string, unknown>)[k]
          }
        }
      }
      if (Object.keys(meta).length > 0) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId,
          { user_metadata: meta },
        )
        if (updateAuthError) {
          // Non-fatal: profile row was already updated
          log('auth_meta_sync_failed', { error: updateAuthError.message })
        }
        updates.displayNameUpdated = true
      }
    }

    // ── 12. Role update ───────────────────────────────────────────────────────
    if (newRole !== undefined) {
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUserId)
        .single()

      if (existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', targetUserId)
        if (roleError) {
          return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `Failed to update role: ${roleError.message}`)
        }
      } else {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUserId, role: newRole })
        if (roleError) {
          return errResponse(corsHeaders, 500, 'INTERNAL_ERROR', `Failed to insert role: ${roleError.message}`)
        }
      }
      updates.roleUpdated = true
    }

    log('success', { targetUserId, updates })

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    return new Response(
      JSON.stringify({ success: true, updates, email: userData?.user?.email || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log('unexpected_error', { error: msg })
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR', detail: msg }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } },
    )
  }
})
