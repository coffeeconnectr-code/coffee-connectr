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

export async function notifyWelcomeEmail(userId, accessToken = null) {
  try {
    const options = {
      body: { userId },
    }

    if (accessToken) {
      options.headers = { Authorization: `Bearer ${accessToken}` }
    }

    const { data, error } = await supabase.functions.invoke('send-welcome-email', options)

    if (error) {
      let details = error.message

      try {
        if (error.context) {
          const body = await error.context.json()
          details = body?.error ?? details
        }
      } catch {
        // Keep the default invoke error message.
      }

      console.error('Welcome email failed:', details)
      return { sent: false, error: details }
    }

    if (data?.skipped) {
      console.info('Welcome email skipped:', data.reason)
    }

    return data ?? { sent: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Welcome email failed:', message)
    return { sent: false, error: message }
  }
}
