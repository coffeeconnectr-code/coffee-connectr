import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_resend_api_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables.')
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser()

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { messageId } = await request.json()
    if (!messageId) {
      return new Response(JSON.stringify({ error: 'messageId is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: message, error: messageError } = await adminClient
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .eq('id', messageId)
      .maybeSingle()

    if (messageError) {
      throw messageError
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (message.sender_id !== caller.id) {
      return new Response(JSON.stringify({ error: 'Forbidden.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { data: recipientProfile, error: recipientProfileError } = await adminClient
      .from('profiles')
      .select('email_on_message')
      .eq('user_id', message.recipient_id)
      .maybeSingle()

    if (recipientProfileError) {
      throw recipientProfileError
    }

    if (recipientProfile?.email_on_message === false) {
      return new Response(JSON.stringify({ skipped: true, reason: 'notifications_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const {
      data: { user: recipient },
      error: recipientError,
    } = await adminClient.auth.admin.getUserById(message.recipient_id)

    if (recipientError) {
      throw recipientError
    }

    if (!recipient?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_recipient_email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { data: senderProfile, error: senderProfileError } = await adminClient
      .from('profiles')
      .select('name')
      .eq('user_id', message.sender_id)
      .maybeSingle()

    if (senderProfileError) {
      throw senderProfileError
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') ?? 'Coffee Connectr <onboarding@resend.dev>'
    const senderName = senderProfile?.name?.trim() || 'A Coffee Connectr member'
    const preview =
      message.body.length > 160 ? `${message.body.slice(0, 160).trim()}…` : message.body
    const threadUrl = `${siteUrl}/messages/${message.sender_id}`

    const resend = new Resend(resendApiKey)
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipient.email,
      subject: `New message from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0a0a0a;">
          <p><strong>${escapeHtml(senderName)}</strong> sent you a message on Coffee Connectr.</p>
          <blockquote style="margin: 1rem 0; padding: 0.75rem 1rem; border-left: 4px solid #b08d57; background: #f5f2ec;">
            ${escapeHtml(preview)}
          </blockquote>
          <p>
            <a href="${threadUrl}" style="color: #8b6a3e; font-weight: 600;">Open conversation</a>
          </p>
        </div>
      `,
    })

    if (emailError) {
      throw emailError
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
