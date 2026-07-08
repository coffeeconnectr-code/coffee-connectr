import { supabase } from './supabase'
import { trackActivity } from './analytics'

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024

export async function uploadFeedbackScreenshot(file, userId) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (PNG, JPG, etc.)')
  }

  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error('Screenshot must be 5 MB or smaller')
  }

  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error } = await supabase.storage.from('feedback-screenshots').upload(path, file, {
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('feedback-screenshots').getPublicUrl(path)
  return data.publicUrl
}

export async function submitMemberFeedback({ message, screenshotUrl = null }) {
  const { data, error } = await supabase.rpc('submit_member_feedback', {
    p_message: message,
    p_screenshot_url: screenshotUrl,
  })

  if (error) {
    throw error
  }

  trackActivity('feedback_submit', {
    targetType: 'feedback',
    targetId: data,
    properties: { hasScreenshot: Boolean(screenshotUrl) },
  })

  return data
}

export async function fetchMyFeedback() {
  const { data, error } = await supabase.rpc('list_my_feedback')

  if (error) {
    throw error
  }

  return data ?? []
}
