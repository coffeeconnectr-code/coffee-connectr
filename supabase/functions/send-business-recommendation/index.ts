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

function isMissingRecommendationsTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('business_recommendations') ||
    message.includes('schema cache')
  )
}

function renderOptionalField(label: string, value: string | null | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return ''
  }

  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(trimmed)}</p>`
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

    const body = await request.json()
    const {
      contactName,
      businessName,
      businessType,
      location,
      latitude,
      longitude,
      email,
      phone,
      website,
    } = body

    if (website?.trim()) {
      return new Response(JSON.stringify({ sent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const trimmedContactName = String(contactName ?? '').trim()
    const trimmedBusinessName = String(businessName ?? '').trim()
    const trimmedBusinessType = String(businessType ?? '').trim()
    const trimmedLocation = String(location ?? '').trim()
    const trimmedEmail = String(email ?? '').trim()
    const trimmedPhone = String(phone ?? '').trim()

    if (!trimmedContactName || trimmedContactName.length > 120) {
      return new Response(JSON.stringify({ error: 'Please enter a name.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!trimmedBusinessName || trimmedBusinessName.length > 160) {
      return new Response(JSON.stringify({ error: 'Please enter a business name.' }), {
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

    if (trimmedBusinessType.length > 120) {
      return new Response(JSON.stringify({ error: 'Business type is too long.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (trimmedLocation.length > 240) {
      return new Response(JSON.stringify({ error: 'Location is too long.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (trimmedPhone.length > 40) {
      return new Response(JSON.stringify({ error: 'Phone number is too long.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const parsedLatitude =
      latitude == null || latitude === '' ? null : Number(latitude)
    const parsedLongitude =
      longitude == null || longitude === '' ? null : Number(longitude)

    if (
      (parsedLatitude != null && Number.isNaN(parsedLatitude)) ||
      (parsedLongitude != null && Number.isNaN(parsedLongitude))
    ) {
      return new Response(JSON.stringify({ error: 'Please choose a valid map location.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: recommenderProfile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('user_id', caller.id)
      .maybeSingle()

    const recommenderLabel =
      recommenderProfile?.name?.trim() ||
      caller.email?.split('@')[0] ||
      'A Coffee Connectr member'

    const { error: insertError } = await adminClient.from('business_recommendations').insert({
      recommended_by_user_id: caller.id,
      contact_name: trimmedContactName,
      business_name: trimmedBusinessName,
      business_type: trimmedBusinessType || null,
      location: trimmedLocation || null,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      email: trimmedEmail,
      phone: trimmedPhone || null,
    })

    if (insertError) {
      if (isMissingRecommendationsTable(insertError)) {
        return new Response(
          JSON.stringify({
            error:
              'Database setup missing. Run supabase/business_recommendations.sql in the SQL Editor.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }

      throw insertError
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const signUpUrl = `${siteUrl}/sign-up`
    const fromEmail = resolveFromEmail()
    const resend = new Resend(resendApiKey)

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: trimmedEmail,
      subject: `You've been recommended on Coffee Connectr`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0a0a0a; max-width: 640px;">
          <p style="margin-top: 0;">Hi ${escapeHtml(trimmedContactName)},</p>
          <p>
            <strong>${escapeHtml(recommenderLabel)}</strong> recommended
            <strong>${escapeHtml(trimmedBusinessName)}</strong> on
            <strong>Coffee Connectr</strong> — the global map and directory for coffee
            professionals and businesses.
          </p>
          ${renderOptionalField('Business type', trimmedBusinessType)}
          ${renderOptionalField('Location', trimmedLocation)}
          ${renderOptionalField('Phone', trimmedPhone)}
          <p>
            Coffee Connectr helps roasteries, cafés, suppliers, consultants, and other coffee
            businesses get found, connect, and grow. New members get a
            <strong>free month</strong> with full access.
          </p>
          <p style="margin: 1.5rem 0;">
            <a href="${signUpUrl}" style="display: inline-block; padding: 0.75rem 1.25rem; border-radius: 999px; background: #8b6a3e; color: #ffffff; text-decoration: none; font-weight: 600;">
              Join Coffee Connectr — free for your first month
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
