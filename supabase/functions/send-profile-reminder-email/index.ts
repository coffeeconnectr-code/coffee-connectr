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

function isMissingReminderTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('profile_reminder_emails_sent') ||
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

    const body = await request.json().catch(() => ({}))
    const { userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user id.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
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

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.admin.getUserById(userId)

    if (userError) {
      throw userError
    }

    if (!user?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_user_email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('name, is_profile_complete, is_hidden, is_suspended')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (profile?.is_hidden || profile?.is_suspended) {
      return new Response(JSON.stringify({ skipped: true, reason: 'profile_unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (profile?.is_profile_complete) {
      return new Response(JSON.stringify({ skipped: true, reason: 'profile_already_listed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail = resolveFromEmail()
    const profileUrl = `${siteUrl}/profile/edit`
    const displayName = profile?.name?.trim() || 'there'
    const introLine = profile
      ? 'Your Coffee Connectr profile is not complete yet, so it is not visible in Discover or on the map.'
      : 'You have joined Coffee Connectr, but you have not created your profile yet, so you are not visible in Discover or on the map.'

    const resend = new Resend(resendApiKey)
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: 'Finish your Coffee Connectr profile',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0a0a0a; max-width: 640px;">
          <p style="margin-top: 0;">Hi ${escapeHtml(displayName)},</p>
          <p>
            ${introLine}
          </p>
          <p>
            Please ${profile ? 'finish the required fields in your profile' : 'create your profile and fill in the required fields'} — photo, bio, categories, location,
            contact details, and the rest of your member information. Roasting equipment is optional.
          </p>
          <p style="margin: 1.5rem 0 1rem;">
            <a href="${profileUrl}" style="display: inline-block; padding: 0.75rem 1.25rem; border-radius: 999px; background: #8b6a3e; color: #ffffff; font-weight: 600; text-decoration: none;">
              ${profile ? 'Finish your profile' : 'Create your profile'}
            </a>
          </p>
          <p style="color: #5c5c5c; font-size: 0.95rem;">
            Once everything is filled in and you save, your profile will appear for other members to
            find.
          </p>
          <p style="color: #5c5c5c; font-size: 0.95rem;">
            Questions? Visit <a href="${siteUrl}/contact" style="color: #8b6a3e;">our contact page</a>.
          </p>
        </div>
      `,
    })

    if (emailError) {
      const resendMessage = getResendErrorMessage(emailError)

      return new Response(JSON.stringify({ error: resendMessage, from: fromEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { error: logError } = await adminClient.from('profile_reminder_emails_sent').insert({
      user_id: userId,
      sent_by: caller.id,
    })

    if (logError) {
      if (isMissingReminderTable(logError)) {
        return new Response(
          JSON.stringify({
            sent: true,
            warning:
              'Email sent, but tracking failed. Run supabase/profile_reminder_emails.sql in the SQL Editor.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      throw logError
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
