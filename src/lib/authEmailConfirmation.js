import { supabase } from './supabase'

const OAUTH_PROVIDERS = new Set([
  'google',
  'apple',
  'github',
  'facebook',
  'twitter',
  'discord',
  'linkedin',
  'azure',
  'bitbucket',
  'gitlab',
  'keycloak',
  'notion',
  'twitch',
  'slack',
  'spotify',
  'workos',
  'zoom',
])

export const PENDING_EMAIL_CONFIRMATION_KEY = 'auth_pending_confirmation'

export const EMAIL_CONFIRMATION_MESSAGE =
  'Please confirm your email before signing in. You can resend the confirmation link below.'

export function userNeedsEmailConfirmation(user) {
  if (!user) {
    return false
  }

  if (user.email_confirmed_at) {
    return false
  }

  const providers = (user.identities ?? []).map((identity) => identity.provider)

  if (providers.some((provider) => OAUTH_PROVIDERS.has(provider))) {
    return false
  }

  return providers.includes('email') || providers.length === 0
}

export function markPendingEmailConfirmation(email) {
  if (typeof sessionStorage === 'undefined' || !email) {
    return
  }

  sessionStorage.setItem(PENDING_EMAIL_CONFIRMATION_KEY, email)
}

export function consumePendingEmailConfirmation() {
  if (typeof sessionStorage === 'undefined') {
    return ''
  }

  const email = sessionStorage.getItem(PENDING_EMAIL_CONFIRMATION_KEY) ?? ''
  sessionStorage.removeItem(PENDING_EMAIL_CONFIRMATION_KEY)
  return email
}

let initialConfirmationPromptLoaded = false
let initialConfirmationPrompt = {
  email: '',
  message: '',
  showResendPanel: false,
  pendingConfirmationEmail: '',
}

export function getInitialConfirmationPrompt() {
  if (initialConfirmationPromptLoaded) {
    return initialConfirmationPrompt
  }

  initialConfirmationPromptLoaded = true
  const pendingEmail = consumePendingEmailConfirmation()

  if (!pendingEmail) {
    return initialConfirmationPrompt
  }

  initialConfirmationPrompt = {
    email: pendingEmail,
    message: EMAIL_CONFIRMATION_MESSAGE,
    showResendPanel: true,
    pendingConfirmationEmail: pendingEmail,
  }

  return initialConfirmationPrompt
}

export async function enforceEmailConfirmation(session) {
  if (!session?.user || !userNeedsEmailConfirmation(session.user)) {
    return session
  }

  markPendingEmailConfirmation(session.user.email ?? '')
  await supabase.auth.signOut()
  return null
}
