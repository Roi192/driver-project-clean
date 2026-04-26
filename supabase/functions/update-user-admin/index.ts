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

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Only admins can update users')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { targetUserId, displayName, newRole, profileUpdates } = await req.json()

    if (!targetUserId) {
      throw new Error('Target user ID is required')
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
        const { data: updatedProfile, error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update(profilePayload)
          .eq('user_id', targetUserId)
          .select('id')
          .maybeSingle()

        if (profileUpdateError) {
          console.error('Error updating profile:', profileUpdateError)
          throw new Error('Failed to update profile')
        }

        // If the profile row doesn't exist, treat it as an error (shouldn't happen)
        if (!updatedProfile) {
          throw new Error('Profile not found for target user')
        }

        updates.profileUpdated = true
      }
    }

    // Update display name in auth.users if provided
    if (displayName !== undefined) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { user_metadata: { full_name: displayName } }
      )
      if (updateAuthError) {
        console.error('Error updating auth user:', updateAuthError)
        throw new Error('Failed to update auth user')
      }
      updates.displayNameUpdated = true
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