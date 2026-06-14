import { supabase } from './supabase'

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

  return data
}
