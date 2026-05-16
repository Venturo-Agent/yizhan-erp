// supabase/functions/workspace-api/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v4 as uuidv4 } from 'https://esm.sh/uuid'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client with the service_role key to bypass RLS
// for internal permission checks.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function getWorkspaceId(channelId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('channels')
    .select('workspace_id')
    .eq('id', channelId)
    .single()
  if (error) {
    console.error('Error fetching workspace_id:', error)
    return null
  }
  return data.workspace_id
}

/**
 * Checks if a user has permission to access a specific channel.
 * This is the core of our API-level security (Phase 1).
 * @param {string} userId - The ID of the user.
 * @param {string} channelId - The ID of the channel.
 * @returns {Promise<boolean>} - True if the user has access, false otherwise.
 */
async function canUserAccessChannel(userId: string, channelId: string): Promise<boolean> {
  const workspace_id = await getWorkspaceId(channelId)
  if (!workspace_id) {
    return false
  }

  // Now, check if the user is a member of that workspace.
  const { data: memberData, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace_id)
    .eq('user_id', userId)
    .single()

  if (memberError || !memberData) {
    // No membership record found.
    return false
  }

  // User is a member of the workspace, so they have access.
  return true
}

// Helper to get user from auth header
async function getSupabaseUser(authHeader: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

serve(async req => {
  const url = new URL(req.url)
  const path = url.pathname.replace('/workspace-api', '')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const user = await getSupabaseUser(authHeader)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- ROUTE: GET /messages ---
    if (path === '/messages' && req.method === 'GET') {
      const channel_id = url.searchParams.get('channel_id')
      const cursor = url.searchParams.get('cursor') // ISO timestamp
      const limit = parseInt(url.searchParams.get('limit') || '50', 10)

      if (!channel_id) {
        return new Response(JSON.stringify({ error: 'channel_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const hasPermission = await canUserAccessChannel(user.id, channel_id)
      if (!hasPermission) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let query = supabaseAdmin
        .from('workspace_messages')
        .select(
          `
                id,
                content,
                created_at,
                user_id,
                file_id,
                workspace_files (*)
            `
        )
        .eq('channel_id', channel_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (cursor) {
        query = query.lt('created_at', cursor)
      }

      const { data: messages, error } = await query

      if (error) throw error

      const nextCursor = messages.length === limit ? messages[messages.length - 1].created_at : null

      return new Response(JSON.stringify({ messages, nextCursor }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- ROUTE: POST /files/signed-url ---
    if (path === '/files/signed-url' && req.method === 'POST') {
      const { channel_id, file_name, mime_type } = await req.json()
      if (!channel_id || !file_name || !mime_type) {
        return new Response(
          JSON.stringify({ error: 'channel_id, file_name, and mime_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const hasPermission = await canUserAccessChannel(user.id, channel_id)
      if (!hasPermission) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const workspace_id = await getWorkspaceId(channel_id)
      const uniqueFileName = `${uuidv4()}-${file_name}`
      const storage_path = `${workspace_id}/${user.id}/${uniqueFileName}`

      const { data, error } = await supabaseAdmin.storage
        .from('workspace_files')
        .createSignedUploadUrl(storage_path)

      if (error) throw error

      return new Response(JSON.stringify({ ...data, path: storage_path }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- ROUTE: POST /files/upload-complete ---
    if (path === '/files/upload-complete' && req.method === 'POST') {
      const { channel_id, path, file_name, mime_type, size_bytes } = await req.json()
      if (!channel_id || !path || !file_name || !mime_type || !size_bytes) {
        return new Response(
          JSON.stringify({
            error: 'channel_id, path, file_name, mime_type, and size_bytes are required',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const hasPermission = await canUserAccessChannel(user.id, channel_id)
      if (!hasPermission) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const workspace_id = await getWorkspaceId(channel_id)

      // 1. Insert file metadata
      const { data: fileData, error: fileError } = await supabaseAdmin
        .from('workspace_files')
        .insert({
          uploader_id: user.id,
          workspace_id: workspace_id,
          file_name: file_name,
          storage_path: path,
          mime_type: mime_type,
          size_bytes: size_bytes,
        })
        .select()
        .single()

      if (fileError) throw fileError

      // 2. Create a message referencing the file
      const { data: messageData, error: messageError } = await supabaseAdmin
        .from('workspace_messages')
        .insert({
          channel_id: channel_id,
          user_id: user.id,
          file_id: fileData.id,
        })
        .select()
        .single()

      if (messageError) throw messageError

      return new Response(JSON.stringify(messageData), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- ROUTE: POST /messages ---
    if (path === '/messages' && req.method === 'POST') {
      const { channel_id, content } = await req.json()
      if (!channel_id || !content) {
        return new Response(JSON.stringify({ error: 'channel_id and content are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const hasPermission = await canUserAccessChannel(user.id, channel_id)
      if (!hasPermission) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: newMessage, error: insertError } = await supabaseAdmin
        .from('workspace_messages')
        .insert({
          channel_id,
          user_id: user.id,
          content,
        })
        .select()
        .single()

      if (insertError) throw insertError

      return new Response(JSON.stringify(newMessage), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
