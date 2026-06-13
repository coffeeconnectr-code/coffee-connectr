import { supabase } from './supabase'

export async function notifyNewMessage(messageId) {
  try {
    await supabase.functions.invoke('send-message-notification', {
      body: { messageId },
    })
  } catch {
    // Email delivery is best-effort and should not block sending messages.
  }
}
