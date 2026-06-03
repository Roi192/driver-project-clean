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

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body')
    }
    const { targetUserId } = body as { targetUserId?: unknown }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
      throw new Error('Target user ID must be a valid UUID')
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

    // Delete related records first to avoid FK constraint errors.
    // We intentionally KEEP user-generated content (shift_reports, photos,
    // hagmar_*, equipment_tracking, work_schedule, etc.) because the
    // foreign keys to auth.users on those tables are ON DELETE SET NULL.
    const cleanupErrors: string[] = []
    const rolesDel = await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId)
    if (rolesDel.error) cleanupErrors.push(`user_roles: ${rolesDel.error.message}`)
    const profilesDel = await supabaseAdmin.from('profiles').delete().eq('user_id', targetUserId)
    if (profilesDel.error) cleanupErrors.push(`profiles: ${profilesDel.error.message}`)

    // Delete the user from auth.users (cascading FKs will handle related rows)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      const detail = [deleteError.message, ...cleanupErrors].filter(Boolean).join(' | ')
      throw new Error(`מחיקת המשתמש נכשלה: ${detail}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})