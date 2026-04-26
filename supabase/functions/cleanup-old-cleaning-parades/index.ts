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

    // This is a scheduled cleanup function invoked by pg_cron.
    // verify_jwt is already false in config.toml; no user auth needed.

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const nineDaysAgo = new Date()
    nineDaysAgo.setDate(nineDaysAgo.getDate() - 9)
    const cutoffDate = nineDaysAgo.toISOString().split('T')[0]

    console.log(`Cleaning up cleaning parade data older than ${cutoffDate} (9 days)`)

    const { data: oldSubmissions, error: fetchError } = await supabase
      .from('cleaning_parade_submissions')
      .select('id, parade_date')
      .lt('parade_date', cutoffDate)

    if (fetchError) throw fetchError

    if (!oldSubmissions || oldSubmissions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No old data to clean up', deletedSubmissions: 0, deletedPhotos: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const submissionIds = oldSubmissions.map(s => s.id)

    const { data: completions } = await supabase
      .from('cleaning_checklist_completions')
      .select('id, photo_url')
      .in('submission_id', submissionIds)

    const storagePaths: string[] = []
    completions?.forEach(c => {
      if (c.photo_url && c.photo_url.includes('cleaning-parades')) {
        const match = c.photo_url.match(/cleaning-parades\/([^?]+)/)
        if (match) storagePaths.push(match[1])
      }
    })

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('cleaning-parades')
        .remove(storagePaths)
      if (storageError) console.error('Error deleting photos:', storageError)
      else console.log(`Deleted ${storagePaths.length} photos`)
    }

    await supabase
      .from('cleaning_checklist_completions')
      .delete()
      .in('submission_id', submissionIds)

    const { error: deleteError } = await supabase
      .from('cleaning_parade_submissions')
      .delete()
      .lt('parade_date', cutoffDate)

    if (deleteError) throw deleteError

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${oldSubmissions.length} submissions and ${storagePaths.length} photos`,
        deletedSubmissions: oldSubmissions.length,
        deletedPhotos: storagePaths.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in cleanup-old-cleaning-parades:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})