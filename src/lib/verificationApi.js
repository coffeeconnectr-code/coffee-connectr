import { supabase } from './supabase'

function normalizeReference(reference) {
  return {
    business_name: reference.businessName.trim(),
    contact_name: reference.contactName.trim(),
    email: reference.email.trim().toLowerCase(),
    phone: reference.phone.trim(),
    address: reference.address.trim(),
  }
}

export async function submitVerificationRequest(message = '', references = []) {
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

  return requestId
}
