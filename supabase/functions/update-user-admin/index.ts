import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create client with user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !callerUser) {
      throw new Error('Unauthorized')
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single()

    const allowedRoles = ['admin', 'super_admin', 'hagmar_admin', 'ravshatz', 'division_admin']
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      throw new Error('Only admins can update users')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body')
    }
    const { targetUserId, displayName, newRole, profileUpdates } = body as {
      targetUserId?: unknown
      displayName?: unknown
      newRole?: unknown
      profileUpdates?: unknown
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
      throw new Error('Target user ID must be a valid UUID')
    }
    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.length > 200)) {
      throw new Error('displayName must be a string up to 200 characters')
    }
    const ALLOWED_ROLES = [
      'driver','admin','super_admin','hagmar_admin','battalion_admin',
      'platoon_commander','division_admin','ravshatz','company_commander'
    ]
    if (newRole !== undefined && (typeof newRole !== 'string' || !ALLOWED_ROLES.includes(newRole))) {
      throw new Error('newRole is not a recognized role')
    }
    if (profileUpdates !== undefined && (profileUpdates === null || typeof profileUpdates !== 'object' || Array.isArray(profileUpdates))) {
      throw new Error('profileUpdates must be an object')
    }

    const updates: any = {}

    // Update profile fields (public.profiles) if provided
    if (profileUpdates !== undefined || displayName !== undefined) {
      const profilePayload: Record<string, any> = {
        ...(profileUpdates ?? {}),
      }

      // Backward compatible: displayName maps to profiles.full_name
      if (displayName !== undefined) {
        profilePayload.full_name = displayName
      }

      // Avoid sending an empty update
      if (Object.keys(profilePayload).length > 0) {
        // Check if profile exists for this user
        const { data: existingProfile, error: existingErr } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', targetUserId)
          .maybeSingle()

        if (existingErr) {
          console.error('Error checking profile:', existingErr)
          throw new Error(`Failed to check profile: ${existingErr.message}`)
        }

        if (existingProfile) {
          const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update(profilePayload)
            .eq('user_id', targetUserId)

          if (profileUpdateError) {
            console.error('Error updating profile:', profileUpdateError)
            throw new Error(`Failed to update profile: ${profileUpdateError.message}`)
          }
        } else {
          // No profile exists yet (legacy/orphan auth user) — create one
          const { error: insertErr } = await supabaseAdmin
            .from('profiles')
            .insert({ user_id: targetUserId, ...profilePayload })

          if (insertErr) {
            console.error('Error inserting profile:', insertErr)
            throw new Error(`Failed to create profile: ${insertErr.message}`)
          }
        }

        updates.profileUpdated = true
      }
    }

    // Sync auth.users user_metadata so future orphan-merges show updated info
    if (displayName !== undefined || profileUpdates !== undefined) {
      const meta: Record<string, any> = {}
      if (displayName !== undefined) meta.full_name = displayName
      if (profileUpdates && typeof profileUpdates === 'object') {
        for (const k of ['outpost','region','military_role','platoon','personal_number','battalion_name','department','user_type','settlement','id_number','brigade']) {
          if (k in profileUpdates) meta[k] = (profileUpdates as any)[k]
        }
      }
      if (Object.keys(meta).length > 0) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId,
          { user_metadata: meta }
        )
        if (updateAuthError) {
          console.error('Error updating auth user:', updateAuthError)
          throw new Error(`Failed to update auth user: ${updateAuthError.message}`)
        }
        updates.displayNameUpdated = true
      }
    }

    // Update role if provided
    if (newRole !== undefined) {
      // First check if role entry exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUserId)
        .single()

      if (existingRole) {
        // Update existing role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', targetUserId)

        if (roleError) {
          console.error('Error updating role:', roleError)
          throw new Error('Failed to update role')
        }
      } else {
        // Insert new role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUserId, role: newRole })

        if (roleError) {
          console.error('Error inserting role:', roleError)
          throw new Error('Failed to insert role')
        }
      }
      updates.roleUpdated = true
    }

    // Get user email to return
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    return new Response(
      JSON.stringify({
        success: true,
        updates,
        email: userData?.user?.email || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})