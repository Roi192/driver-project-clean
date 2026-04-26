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

    // Check if caller has an allowed role
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)

    const allowedRoles = ['admin', 'super_admin', 'hagmar_admin']
    const hasPermission = roles?.some(r => allowedRoles.includes(r.role))
    if (!hasPermission) {
      throw new Error('Only admins can delete users')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { targetUserId } = await req.json()

    if (!targetUserId) {
      throw new Error('Target user ID is required')
    }

    // Prevent admin from deleting themselves
    if (targetUserId === callerUser.id) {
      throw new Error('Cannot delete your own account')
    }

    // Get profile to find personal_number for soldier matching
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('personal_number')
      .eq('user_id', targetUserId)
      .maybeSingle()

    // Delete soldier record if personal_number matches
    if (profile?.personal_number) {
      await supabaseAdmin
        .from('soldiers')
        .delete()
        .eq('personal_number', profile.personal_number)
    }

    // Delete related records first to avoid FK constraint errors
    await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId)
    await supabaseAdmin.from('profiles').delete().eq('user_id', targetUserId)

    // Delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      throw new Error('Failed to delete user')
    }

    return new Response(
      JSON.stringify({ success: true }),
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