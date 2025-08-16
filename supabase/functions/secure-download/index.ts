import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const submissionId = url.searchParams.get('submission_id')
    const fileId = url.searchParams.get('file_id')

    if (!submissionId || !fileId) {
      return new Response(
        JSON.stringify({ error: 'Missing submission_id or file_id parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has access to this content
    const { data: file, error: fileError } = await supabaseClient
      .from('content_files')
      .select(`
        *,
        content_submissions!inner(
          id,
          creator_id,
          status
        )
      `)
      .eq('id', fileId)
      .eq('submission_id', submissionId)
      .single()

    if (fileError || !file) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const submission = file.content_submissions

    // Check access permissions
    let hasAccess = false

    // Creator can always access their own files
    if (submission.creator_id === user.id) {
      hasAccess = true
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userRole?.role === 'admin') {
      hasAccess = true
    }

    // Check if content is approved and user has active subscription or purchase
    if (submission.status === 'approved') {
      // Check for active subscription
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('subscribed, subscription_end')
        .eq('user_id', user.id)
        .single()

      if (profile?.subscribed && (!profile.subscription_end || new Date(profile.subscription_end) > new Date())) {
        hasAccess = true
      }
      
      // Note: Individual purchase logic would go here when implemented
      // For now, subscription-based access is the primary model
    }

    // For preview files, allow access if content is approved
    if (file.is_preview && submission.status === 'approved') {
      hasAccess = true
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine bucket from file metadata or file path
    const bucket = file.metadata?.bucket || (file.is_original ? 'original-files' : 'seller-content')

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from(bucket)
      .createSignedUrl(file.file_path, 3600) // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log download activity if this is an original file
    if (file.is_original) {
      await supabaseClient
        .from('downloads')
        .insert({
          user_id: user.id,
          submission_id: submissionId,
          downloaded_at: new Date().toISOString()
        })
        .onConflict('user_id,submission_id')
        .ignoreDuplicates()
    }

    return new Response(
      JSON.stringify({ 
        download_url: signedUrlData.signedUrl,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        file_name: file.file_name,
        file_type: file.file_type,
        file_size: file.file_size
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in secure-download function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})