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

    const { reportId } = await request.json()
    if (!reportId) {
      return new Response(JSON.stringify({ error: 'reportId is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: report, error: reportError } = await adminClient
      .from('content_reports')
      .select('id, reporter_id, target_type, target_id, reason, details, created_at')
      .eq('id', reportId)
      .maybeSingle()

    if (reportError) {
      throw reportError
    }

    if (!report) {
      return new Response(JSON.stringify({ error: 'Report not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (report.reporter_id !== caller.id) {
      return new Response(JSON.stringify({ error: 'Forbidden.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { data: reporterProfile, error: reporterProfileError } = await adminClient
      .from('profiles')
      .select('name')
      .eq('user_id', report.reporter_id)
      .maybeSingle()

    if (reporterProfileError) {
      throw reporterProfileError
    }

    const { data: adminProfiles, error: adminProfilesError } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('is_admin', true)

    if (adminProfilesError) {
      throw adminProfilesError
    }

    const adminEmails: string[] = []
    const fallbackEmail = Deno.env.get('ADMIN_EMAIL')?.trim()

    for (const adminProfile of adminProfiles ?? []) {
      const {
        data: { user: adminUser },
        error: adminUserError,
      } = await adminClient.auth.admin.getUserById(adminProfile.user_id)

      if (!adminUserError && adminUser?.email) {
        adminEmails.push(adminUser.email)
      }
    }

    if (adminEmails.length === 0 && fallbackEmail) {
      adminEmails.push(fallbackEmail)
    }

    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_admin_emails' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') ?? 'Coffee Connectr <onboarding@resend.dev>'
    const reporterName = reporterProfile?.name?.trim() || 'A member'
    const reportsUrl = `${siteUrl}/admin/reports`

    const resend = new Resend(resendApiKey)
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: `New ${report.target_type} report on Coffee Connectr`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0a0a0a;">
          <p><strong>${escapeHtml(reporterName)}</strong> submitted a new report.</p>
          <p><strong>Type:</strong> ${escapeHtml(report.target_type)}</p>
          <p><strong>Reason:</strong> ${escapeHtml(report.reason)}</p>
          ${report.details ? `<p><strong>Details:</strong> ${escapeHtml(report.details)}</p>` : ''}
          <p>
            <a href="${reportsUrl}" style="color: #8b6a3e; font-weight: 600;">Open reports queue</a>
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
