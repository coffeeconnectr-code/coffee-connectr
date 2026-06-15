import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WELCOME_WINDOW_HOURS = 72

const HOW_TO_USE_STEPS = [
  {
    number: '01',
    title: 'Create your account',
    intro: "Sign up with your email or your Google account. It's free to join and free to be on the map.",
  },
  {
    number: '02',
    title: 'Build your profile',
    intro: 'Tell the coffee world who you are.',
    bullets: [
      "Choose whether you're joining as an individual or a business.",
      'Add your name, photo or logo, and a short description of what you do.',
      'Drop your pin on the map so people can find you by location.',
    ],
  },
  {
    number: '03',
    title: 'Choose your categories',
    intro: 'This is how people find you.',
    bullets: [
      'Pick your primary category — this sets the icon that represents you on the map.',
      "Add any other categories you work across. Many people in coffee wear several hats, and that's exactly what this is built for.",
    ],
  },
  {
    number: '04',
    title: 'Explore the map',
    intro: 'Find the people and businesses you need.',
    bullets: [
      "Browse the map to see who's out there.",
      'Filter by category to narrow it down — for example, show only Roastery Technical Support, or only Green Coffee.',
      'Search by location to find people near you, or anywhere in the world.',
      'Click any pin to see a preview, and open the full profile for more.',
    ],
  },
  {
    number: '05',
    title: 'Connect',
    intro: "Found someone you'd like to work with?",
    bullets: [
      'Message them directly through Coffee Connectr to start a conversation in the platform, or',
      'Reveal their contact details to reach out your own way.',
    ],
  },
  {
    number: '06',
    title: 'Buy and sell',
    intro: 'Visit the noticeboard to browse and post listings.',
    bullets: [
      'Check For Sale for used equipment — roasters, machines, grinders and more.',
      'Post your own listing with photos, a price, a category and a location, so the right buyer can find it.',
    ],
  },
  {
    number: '07',
    title: 'Tools & resources',
    intro: 'Share useful links, templates, and documents with the community.',
    bullets: [
      'Browse the Tools & Resources section for guides, spreadsheets, and online tools.',
      'Post a link or upload a document to help other members.',
    ],
  },
]

const PROFILE_TIPS = [
  'Be specific. The more clearly you list what you do, the easier you are to find.',
  'Use a good photo or logo. Profiles with images get noticed.',
  'Keep it current. Update your details as your business grows or your services change.',
]

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderStepsHtml() {
  return HOW_TO_USE_STEPS.map((step) => {
    const bullets = step.bullets
      ? `<ul style="margin: 0.5rem 0 0; padding-left: 1.25rem;">${step.bullets
          .map((bullet) => `<li style="margin-bottom: 0.35rem;">${escapeHtml(bullet)}</li>`)
          .join('')}</ul>`
      : ''

    return `
      <div style="margin-bottom: 1.25rem;">
        <p style="margin: 0 0 0.25rem; color: #b08d57; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.04em;">
          STEP ${escapeHtml(step.number)}
        </p>
        <h3 style="margin: 0 0 0.35rem; font-size: 1.05rem;">${escapeHtml(step.title)}</h3>
        <p style="margin: 0;">${escapeHtml(step.intro)}</p>
        ${bullets}
      </div>
    `
  }).join('')
}

function renderTipsHtml() {
  return `<ul style="margin: 0; padding-left: 1.25rem;">${PROFILE_TIPS.map(
    (tip) => `<li style="margin-bottom: 0.35rem;">${escapeHtml(tip)}</li>`,
  ).join('')}</ul>`
}

function hoursSince(dateValue: string) {
  return (Date.now() - new Date(dateValue).getTime()) / (1000 * 60 * 60)
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

function isMissingWelcomeTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('welcome_emails_sent') ||
    message.includes('schema cache')
  )
}

function isDuplicateWelcomeRow(error: { message?: string; code?: string } | null) {
  return error?.code === '23505'
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

    const { userId } = await request.json().catch(() => ({}))
    if (!userId || userId !== caller.id) {
      return new Response(JSON.stringify({ error: 'Forbidden.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: existing, error: existingError } = await adminClient
      .from('welcome_emails_sent')
      .select('user_id, status')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError) {
      if (isMissingWelcomeTable(existingError)) {
        return new Response(
          JSON.stringify({
            error: 'Database setup missing. Run supabase/welcome_email.sql in the SQL Editor.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }

      throw existingError
    }

    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: 'already_processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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

    const createdAt = user.created_at ?? new Date().toISOString()

    if (hoursSince(createdAt) > WELCOME_WINDOW_HOURS) {
      const { error: skipError } = await adminClient.from('welcome_emails_sent').insert({
        user_id: userId,
        status: 'skipped_legacy',
      })

      if (skipError && !isDuplicateWelcomeRow(skipError)) {
        if (isMissingWelcomeTable(skipError)) {
          return new Response(
            JSON.stringify({
              error: 'Database setup missing. Run supabase/welcome_email.sql in the SQL Editor.',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            },
          )
        }

        throw skipError
      }

      return new Response(JSON.stringify({ skipped: true, reason: 'legacy_account' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { error: lockError } = await adminClient.from('welcome_emails_sent').insert({
      user_id: userId,
      status: 'sent',
    })

    if (lockError) {
      if (isDuplicateWelcomeRow(lockError)) {
        return new Response(JSON.stringify({ skipped: true, reason: 'already_processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      if (isMissingWelcomeTable(lockError)) {
        return new Response(
          JSON.stringify({
            error: 'Database setup missing. Run supabase/welcome_email.sql in the SQL Editor.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }

      throw lockError
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.coffeeconnectr.com'
    const fromEmail = resolveFromEmail()
    const profileUrl = `${siteUrl}/profile/edit`
    const mapUrl = `${siteUrl}/discover/map`
    const howToUrl = `${siteUrl}/how-to-use`

    const resend = new Resend(resendApiKey)
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: "Welcome to Coffee Connectr - here's how to get started",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0a0a0a; max-width: 640px;">
          <p style="margin-top: 0;">Welcome to <strong>Coffee Connectr</strong>.</p>
          <p>
            You now have a <strong>30-day free trial</strong> with full access. Here’s how to get
            the most out of the platform in a few minutes.
          </p>

          <div style="margin: 1.5rem 0; padding: 1.25rem; border-radius: 12px; background: #f5f2ec; border: 1px solid #e2ddd3;">
            ${renderStepsHtml()}
          </div>

          <h3 style="margin-bottom: 0.5rem;">Tips for a great profile</h3>
          ${renderTipsHtml()}

          <p style="margin: 1.5rem 0 1rem;">
            <a href="${profileUrl}" style="display: inline-block; margin-right: 0.75rem; color: #8b6a3e; font-weight: 600;">Create your profile</a>
            <a href="${mapUrl}" style="display: inline-block; margin-right: 0.75rem; color: #8b6a3e; font-weight: 600;">Explore the map</a>
            <a href="${howToUrl}" style="display: inline-block; color: #8b6a3e; font-weight: 600;">Full how-to guide</a>
          </p>

          <p style="color: #5c5c5c; font-size: 0.95rem;">
            Questions? Visit <a href="${siteUrl}/contact" style="color: #8b6a3e;">our contact page</a> and we&apos;ll help.
          </p>
        </div>
      `,
    })

    if (emailError) {
      await adminClient.from('welcome_emails_sent').delete().eq('user_id', userId)

      const resendMessage = getResendErrorMessage(emailError)

      return new Response(JSON.stringify({ error: resendMessage, from: fromEmail }), {
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
