import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_BATCH_SIZE = 25

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderMessageHtml(message: string) {
  return message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 1rem;">${escapeHtml(paragraph).replaceAll('\n', '<br />')}</p>`,
    )
    .join('')
}

function resolveFromEmail() {
  const configured = Deno.env.get('RESEND_FROM_EMAIL')?.trim()
  const fallback = 'Coffee Connectr <hello@coffeeconnectr.com>'

  if (!configured) {
    return fallback
  }

  if (configured.includes('onboarding@resend.dev')) {
    return fallback
  }

  return configured
}

function getResendErrorMessage(emailError: unknown) {
  if (typeof emailError === 'object' && emailError !== null) {
    if ('message' in emailError && emailError.message) {
      return String(emailError.message)
    }

    if ('error' in emailError && emailError.error) {
      return String(emailError.error)
    }
  }

  return 'Resend rejected the email'
}

async function isCallerAdmin(
  adminClient: ReturnType<typeof createClient>,
  callerId: string,
) {
  const { data, error } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('user_id', callerId)
    .maybeSingle()

  if (error) {
    return false
  }

  return data?.is_admin === true
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

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const callerIsAdmin = await isCallerAdmin(adminClient, caller.id)

    if (!callerIsAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const body = await request.json().catch(() => ({}))
    const { broadcastId, offset = 0, batchSize = DEFAULT_BATCH_SIZE } = body

    if (!broadcastId) {
      return new Response(JSON.stringify({ error: 'Missing broadcast id.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data: broadcast, error: broadcastError } = await adminClient
      .from('member_broadcasts')
      .select(
        'id, subject, message, exclude_suspended, recipient_count, sent_count, failed_count, status',
      )
      .eq('id', broadcastId)
      .maybeSingle()

    if (broadcastError) {
      throw broadcastError
    }

    if (!broadcast) {
      return new Response(JSON.stringify({ error: 'Broadcast not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (broadcast.status !== 'sending') {
      return new Response(JSON.stringify({ error: 'This broadcast has already finished sending.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const safeBatchSize = Math.min(Math.max(Number(batchSize) || DEFAULT_BATCH_SIZE, 1), 50)
    const safeOffset = Math.max(Number(offset) || 0, 0)

    const { data: recipients, error: recipientsError } = await adminClient.rpc(
      'service_list_member_broadcast_recipients',
      {
        p_exclude_suspended: broadcast.exclude_suspended,
        p_limit: safeBatchSize,
        p_offset: safeOffset,
      },
    )

    if (recipientsError) {
      const message = recipientsError.message ?? 'Failed to load broadcast recipients.'
      const missingSetup =
        recipientsError.code === 'PGRST202' ||
        message.includes('service_list_member_broadcast_recipients')

      if (missingSetup) {
        return new Response(
          JSON.stringify({
            error: 'Database setup missing. Run supabase/admin_member_broadcasts.sql in the SQL Editor.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }

      throw recipientsError
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail = resolveFromEmail()
    const resend = new Resend(resendApiKey)
    const messageHtml = renderMessageHtml(broadcast.message)

    let batchSentCount = 0
    let batchFailedCount = 0
    let lastError: string | null = null

    for (const recipient of recipients ?? []) {
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: recipient.email,
        subject: broadcast.subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0a0a0a; max-width: 640px;">
            <p style="margin-top: 0;">Hi ${escapeHtml(recipient.profile_name)},</p>
            ${messageHtml}
            <div style="margin: 1.5rem 0; padding: 1rem 1.25rem; border-radius: 12px; background: #f5f2ec; border: 1px solid #e2ddd3;">
              <p style="margin: 0 0 0.5rem;"><strong>Coffee Connectr</strong></p>
              <p style="margin: 0;">
                Visit the map, update your profile, and connect with coffee professionals at
                <a href="${siteUrl}/discover/map" style="color: #8b6a3e;">${siteUrl}/discover/map</a>.
              </p>
            </div>
            <p style="color: #5c5c5c; font-size: 0.95rem; margin-bottom: 0;">
              Questions? Contact us via
              <a href="${siteUrl}/contact" style="color: #8b6a3e;">${siteUrl}/contact</a>.
            </p>
          </div>
        `,
      })

      if (emailError) {
        batchFailedCount += 1
        lastError = getResendErrorMessage(emailError)
        continue
      }

      batchSentCount += 1
    }

    const nextOffset = safeOffset + (recipients?.length ?? 0)
    const nextSentCount = broadcast.sent_count + batchSentCount
    const nextFailedCount = broadcast.failed_count + batchFailedCount
    const processedCount = nextSentCount + nextFailedCount
    const hasMore = nextOffset < broadcast.recipient_count && (recipients?.length ?? 0) > 0
    const nextStatus = hasMore
      ? 'sending'
      : nextFailedCount > 0 && nextSentCount === 0
        ? 'failed'
        : nextFailedCount > 0
          ? 'partial'
          : 'sent'

    const { error: updateError } = await adminClient
      .from('member_broadcasts')
      .update({
        sent_count: nextSentCount,
        failed_count: nextFailedCount,
        status: nextStatus,
        last_error: lastError,
        sent_at: hasMore ? null : new Date().toISOString(),
      })
      .eq('id', broadcastId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        sent: true,
        batchSentCount,
        batchFailedCount,
        totalRecipients: broadcast.recipient_count,
        processedCount,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
        status: nextStatus,
        lastError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
