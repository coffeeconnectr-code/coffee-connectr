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

function isMissingReferencesTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('verification_request_references') ||
    message.includes('schema cache')
  )
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

    const { requestId } = await request.json()

    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing verification request id.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: verificationRequest, error: requestError } = await adminClient
      .from('verification_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError) {
      throw requestError
    }

    if (!verificationRequest || verificationRequest.user_id !== caller.id) {
      return new Response(JSON.stringify({ error: 'Verification request not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('user_id', caller.id)
      .maybeSingle()

    const applicantName = profile?.name?.trim() || caller.email?.split('@')[0] || 'A Coffee Connectr member'

    const { data: references, error: referencesError } = await adminClient
      .from('verification_request_references')
      .select('id, business_name, contact_name, email, phone, address, sort_order, reference_email_sent_at')
      .eq('verification_request_id', requestId)
      .order('sort_order', { ascending: true })

    if (referencesError) {
      if (isMissingReferencesTable(referencesError)) {
        return new Response(
          JSON.stringify({
            error: 'Database setup missing. Run supabase/verification_references.sql in the SQL Editor.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }

      throw referencesError
    }

    if (!references?.length) {
      return new Response(JSON.stringify({ error: 'No references found for this request.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail = resolveFromEmail()
    const resend = new Resend(resendApiKey)
    let sentCount = 0

    for (const reference of references) {
      if (reference.reference_email_sent_at) {
        sentCount += 1
        continue
      }

      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: reference.email,
        subject: 'Industry reference request on Coffee Connectr',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0a0a0a; max-width: 640px;">
            <p style="margin-top: 0;">Hi ${escapeHtml(reference.contact_name)},</p>
            <p>
              <strong>${escapeHtml(applicantName)}</strong> has listed you and
              <strong>${escapeHtml(reference.business_name)}</strong> as an industry reference while
              applying for verified status on <strong>Coffee Connectr</strong>.
            </p>
            <p>
              Coffee Connectr is a global directory and map for coffee professionals and businesses.
              Verified members have been reviewed by our team, including the trade references they provide.
            </p>
            <p>
              No action is required from you unless our team contacts you to confirm this reference.
              We are letting you know as a courtesy because your details were submitted as part of
              their verification application.
            </p>
            <p style="margin: 0.5rem 0;"><strong>Reference details submitted:</strong></p>
            <ul style="margin: 0 0 1rem; padding-left: 1.25rem;">
              <li>Business: ${escapeHtml(reference.business_name)}</li>
              <li>Contact: ${escapeHtml(reference.contact_name)}</li>
              <li>Email: ${escapeHtml(reference.email)}</li>
              <li>Phone: ${escapeHtml(reference.phone)}</li>
              <li>Address: ${escapeHtml(reference.address)}</li>
            </ul>
            <p style="color: #5c5c5c; font-size: 0.95rem;">
              If you believe this was submitted in error, please contact us via
              <a href="${siteUrl}/contact" style="color: #8b6a3e;">${siteUrl}/contact</a>.
            </p>
          </div>
        `,
      })

      if (emailError) {
        return new Response(JSON.stringify({ error: getResendErrorMessage(emailError), from: fromEmail, sentCount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      const { error: updateError } = await adminClient
        .from('verification_request_references')
        .update({ reference_email_sent_at: new Date().toISOString() })
        .eq('id', reference.id)

      if (updateError) {
        throw updateError
      }

      sentCount += 1
    }

    return new Response(JSON.stringify({ sent: true, sentCount }), {
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
