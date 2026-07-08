import { supabase } from './supabase'
import { trackActivity } from './analytics'

export async function submitContactForm({ name, email, topic, message, website = '' }) {
  const { data, error } = await supabase.functions.invoke('send-contact-form', {
    body: {
      name: name.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
      website,
    },
  })

  if (error) {
    throw error
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  trackActivity('contact_form_submit', {
    properties: { topic },
  })

  return data
}
