import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOPIC_LABELS: Record<string, string> = {
  general: 'General enquiry',
  account: 'Account help',
  billing: 'Billing & subscriptions',
  technical: 'Technical issue',
  feedback: 'Feedback',
  other: 'Other',
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

    const { name, email, topic, message, website } = await request.json()

    if (website?.trim()) {
      return new Response(JSON.stringify({ sent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const trimmedName = String(name ?? '').trim()
    const trimmedEmail = String(email ?? '').trim()
    const trimmedMessage = String(message ?? '').trim()
    const topicValue = String(topic ?? 'general').trim()

    if (!trimmedName || trimmedName.length > 120) {
      return new Response(JSON.stringify({ error: 'Please enter your name.' }), {
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

    if (!trimmedMessage || trimmedMessage.length < 10 || trimmedMessage.length > 4000) {
      return new Response(JSON.stringify({ error: 'Please enter a message at least 10 characters long.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!TOPIC_LABELS[topicValue]) {
      return new Response(JSON.stringify({ error: 'Please choose a valid topic.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables.')
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const adminEmails: string[] = []
    const fallbackEmail = Deno.env.get('ADMIN_EMAIL')?.trim() ?? 'coffeeconnectr@gmail.com'

    const { data: adminProfiles, error: adminProfilesError } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('is_admin', true)

    if (adminProfilesError) {
      throw adminProfilesError
    }

    for (const adminProfile of adminProfiles ?? []) {
      const {
        data: { user: adminUser },
        error: adminUserError,
      } = await adminClient.auth.admin.getUserById(adminProfile.user_id)

      if (!adminUserError && adminUser?.email) {
        adminEmails.push(adminUser.email)
      }
    }

    if (adminEmails.length === 0) {
      adminEmails.push(fallbackEmail)
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') ?? 'Coffee Connectr <onboarding@resend.dev>'
    const topicLabel = TOPIC_LABELS[topicValue]

    const resend = new Resend(resendApiKey)
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: adminEmails,
      replyTo: trimmedEmail,
      subject: `Coffee Connectr contact: ${topicLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0a0a0a;">
          <p><strong>New contact form message</strong></p>
          <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
          <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
          <blockquote style="margin: 1rem 0; padding: 0.75rem 1rem; border-left: 4px solid #b08d57; background: #f5f2ec; white-space: pre-wrap;">
            ${escapeHtml(trimmedMessage)}
          </blockquote>
          <p><a href="${siteUrl}/contact" style="color: #8b6a3e; font-weight: 600;">Contact page</a></p>
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
