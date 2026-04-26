import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    
    // Allow service-role calls (from cron) without user auth check
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized - missing authorization header' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { data: roleData, error: roleError } = await supabaseUser
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'platoon_commander', 'super_admin'])

      const hasPermission = roleData && roleData.length > 0
      if (roleError || !hasPermission) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden - admin access required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]

    console.log(`Cleaning up shift reports older than ${cutoffDate}`)

    const { data: oldReports, error: fetchError } = await supabase
      .from('shift_reports')
      .select('id, photo_front, photo_left, photo_right, photo_back, photo_steering_wheel')
      .lt('report_date', cutoffDate)

    if (fetchError) throw fetchError

    console.log(`Found ${oldReports?.length || 0} reports to delete`)

    // Collect storage file paths from photo values (supports raw paths + signed/public URLs)
    const extractShiftPhotoPath = (value: string | null): string | null => {
      if (!value) return null

      if (!value.startsWith('http')) {
        return value
      }

      const signedOrPublicMatch = value.match(/\/storage\/v1\/object\/(?:sign|public)\/shift-photos\/([^?]+)/)
      if (signedOrPublicMatch) return signedOrPublicMatch[1]

      const legacyMatch = value.match(/shift-photos\/([^?]+)/)
      return legacyMatch ? legacyMatch[1] : null
    }

    const photoPaths = new Set<string>()
    oldReports?.forEach(report => {
      [report.photo_front, report.photo_left, report.photo_right, report.photo_back, report.photo_steering_wheel]
        .forEach(photoValue => {
          const normalizedPath = extractShiftPhotoPath(photoValue)
          if (normalizedPath) {
            photoPaths.add(normalizedPath)
          }
        })
    })

    const photoPathsList = Array.from(photoPaths)

    console.log(`Found ${photoPathsList.length} photos to delete from storage`)

    if (photoPathsList.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('shift-photos')
        .remove(photoPathsList)
      if (storageError) console.error('Error deleting photos:', storageError)
      else console.log(`Deleted ${photoPathsList.length} photos`)
    }

    const { error: deleteError } = await supabase
      .from('shift_reports')
      .delete()
      .lt('report_date', cutoffDate)

    if (deleteError) throw deleteError

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${oldReports?.length || 0} reports and ${photoPathsList.length} photos`,
        deletedReports: oldReports?.length || 0,
        deletedPhotos: photoPathsList.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in cleanup-old-reports:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})