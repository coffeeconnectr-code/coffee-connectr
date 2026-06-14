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

export async function notifyNewReport(reportId) {
  try {
    await supabase.functions.invoke('send-report-notification', {
      body: { reportId },
    })
  } catch {
    // Email delivery is best-effort and should not block submitting reports.
  }
}

export async function notifyWelcomeEmail(userId) {
  try {
    await supabase.functions.invoke('send-welcome-email', {
      body: { userId },
    })
  } catch {
    // Email delivery is best-effort and should not block sign-in.
  }
}
