import { supabase } from './supabase'
import { trackActivity } from './analytics'

const REFERENCE_FIELDS = [
  { key: 'businessName', label: 'Business name' },
  { key: 'contactName', label: 'Main contact name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
]

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeReference(reference) {
  return {
    business_name: reference.businessName.trim(),
    contact_name: reference.contactName.trim(),
    email: reference.email.trim().toLowerCase(),
    phone: reference.phone.trim(),
    address: reference.address.trim(),
  }
}

export function validateVerificationReferences(references) {
  if (!Array.isArray(references) || references.length !== 3) {
    return 'Exactly 3 industry references are required.'
  }

  for (let index = 0; index < references.length; index += 1) {
    const reference = references[index]

    for (const field of REFERENCE_FIELDS) {
      const value = reference[field.key]?.trim() ?? ''

      if (!value) {
        return `Reference ${index + 1}: ${field.label} is required.`
      }
    }

    if (!isValidEmail(reference.email.trim().toLowerCase())) {
      return `Reference ${index + 1}: a valid email is required.`
    }
  }

  return null
}

export async function submitVerificationRequest(message = '', references = []) {
  const validationError = validateVerificationReferences(references)

  if (validationError) {
    throw new Error(validationError)
  }

  const normalizedReferences = references.map(normalizeReference)

  const { data: requestId, error } = await supabase.rpc('submit_verification_request', {
    p_message: message.trim(),
    p_references: normalizedReferences,
  })

  if (error) {
    throw error
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data, error: emailError } = await supabase.functions.invoke(
    'send-verification-reference-emails',
    {
      body: { requestId },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    },
  )

  if (emailError) {
    let details = emailError.message

    try {
      if (emailError.context) {
        const body = await emailError.context.json()
        details = body?.error ?? details
      }
    } catch {
      // Keep invoke error message.
    }

    throw new Error(
      `Your verification request was saved, but reference emails could not be sent: ${details}`,
    )
  }

  if (data?.error) {
    throw new Error(
      `Your verification request was saved, but reference emails could not be sent: ${data.error}`,
    )
  }

  if (data?.skipped) {
    throw new Error(
      'Your verification request was saved, but reference emails are not configured yet.',
    )
  }

  trackActivity('verification_submit', {
    targetType: 'verification_request',
    targetId: requestId,
  })

  return requestId
}
