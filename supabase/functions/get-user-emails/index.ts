
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

    const allowedRoles = ['admin', 'super_admin', 'hagmar_admin']
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      throw new Error('Only admins can view user emails')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get all users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      throw new Error('Failed to fetch users')
    }

    // Map user IDs to emails + return full auth user list (so frontend can show
    // users that exist in auth but don't have a profile row yet)
    const emailMap: Record<string, string> = {}
    const authUsers = [] as Array<{
      id: string
      email: string | null
      created_at: string
      user_metadata: Record<string, any>
    }>
    for (const user of users) {
      if (user.email) {
        emailMap[user.id] = user.email
      }
      authUsers.push({
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at,
        user_metadata: user.user_metadata ?? {},
      })
    }

    return new Response(
      JSON.stringify({ emailMap, authUsers }),
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