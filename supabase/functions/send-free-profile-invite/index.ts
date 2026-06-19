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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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

function isMissingInviteTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('free_profile_invites') ||
    message.includes('schema cache')
  )
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

    const body = await request.json()
    const { inviteId, contactName, email } = body

    let inviteRecord: {
      id: string
      invite_token: string
      contact_name: string
      email: string
      status: string
    } | null = null

    if (inviteId) {
      const { data, error } = await adminClient
        .from('free_profile_invites')
        .select('id, invite_token, contact_name, email, status')
        .eq('id', inviteId)
        .maybeSingle()

      if (error) {
        if (isMissingInviteTable(error)) {
          return new Response(
            JSON.stringify({
              error: 'Database setup missing. Run supabase/free_profile_invites.sql in the SQL Editor.',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            },
          )
        }

        throw error
      }

      inviteRecord = data
    } else {
      const trimmedName = String(contactName ?? '').trim()
      const trimmedEmail = String(email ?? '').trim()

      if (!trimmedName || trimmedName.length > 120) {
        return new Response(JSON.stringify({ error: 'Please enter a name.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      if (!isValidEmail(trimmedEmail) || trimmedEmail.length > 254) {
        return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const { data: existing, error: existingError } = await adminClient
        .from('free_profile_invites')
        .select('id, invite_token, contact_name, email, status')
        .eq('email', trimmedEmail)
        .in('status', ['contact', 'invited'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError && !isMissingInviteTable(existingError)) {
        throw existingError
      }

      if (existing) {
        inviteRecord = existing
        if (existing.contact_name !== trimmedName) {
          await adminClient
            .from('free_profile_invites')
            .update({ contact_name: trimmedName })
            .eq('id', existing.id)
        }
      } else {
        const { data: created, error: createError } = await adminClient
          .from('free_profile_invites')
          .insert({
            contact_name: trimmedName,
            email: trimmedEmail,
            source: 'admin',
            status: 'contact',
          })
          .select('id, invite_token, contact_name, email, status')
          .single()

        if (createError) {
          if (isMissingInviteTable(createError)) {
            return new Response(
              JSON.stringify({
                error: 'Database setup missing. Run supabase/free_profile_invites.sql in the SQL Editor.',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              },
            )
          }

          throw createError
        }

        inviteRecord = created
      }
    }

    if (!inviteRecord) {
      return new Response(JSON.stringify({ error: 'Invite not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (inviteRecord.status === 'redeemed') {
      return new Response(JSON.stringify({ skipped: true, reason: 'already_redeemed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const signUpUrl = `${siteUrl}/sign-up?free=${inviteRecord.invite_token}`
    const fromEmail = resolveFromEmail()
    const resend = new Resend(resendApiKey)

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: inviteRecord.email,
      subject: 'Create your free Coffee Connectr profile for life',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0a0a0a; max-width: 640px;">
          <p style="margin-top: 0;">Hi ${escapeHtml(inviteRecord.contact_name)},</p>
          <p>
            You have been invited to create a <strong>free Coffee Connectr profile for life</strong>.
            Coffee Connectr is the global map and directory for coffee professionals and businesses.
          </p>
          <p>
            Use the link below to create your account with the same email address
            (<strong>${escapeHtml(inviteRecord.email)}</strong>). Your membership will stay free,
            with no monthly subscription required.
          </p>
          <p style="margin: 1.5rem 0;">
            <a href="${signUpUrl}" style="display: inline-block; padding: 0.75rem 1.25rem; border-radius: 999px; background: #8b6a3e; color: #ffffff; text-decoration: none; font-weight: 600;">
              Create your free profile now
            </a>
          </p>
          <p style="color: #5c5c5c; font-size: 0.95rem;">
            If you were not expecting this email, you can safely ignore it.
          </p>
        </div>
      `,
    })

    if (emailError) {
      return new Response(JSON.stringify({ error: getResendErrorMessage(emailError), from: fromEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { error: updateError } = await adminClient
      .from('free_profile_invites')
      .update({
        status: 'invited',
        invited_at: new Date().toISOString(),
        invited_by: caller.id,
      })
      .eq('id', inviteRecord.id)

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ sent: true, inviteId: inviteRecord.id }), {
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
