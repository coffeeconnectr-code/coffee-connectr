import { supabase } from './supabase'
import { notifyNewReport } from './notificationsApi'

export async function checkIsAdmin() {
  const { data, error } = await supabase.rpc('is_current_user_admin')

  if (error) {
    return false
  }

  return Boolean(data)
}

export async function fetchAdminDashboardStats() {
  const { data, error } = await supabase.rpc('admin_get_dashboard_stats')

  if (error) {
    throw error
  }

  return data
}

export async function fetchAdminProfiles(search = '') {
  const { data, error } = await supabase.rpc('admin_list_profiles', {
    p_search: search,
    p_limit: 50,
    p_offset: 0,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchAdminListings(search = '') {
  const { data, error } = await supabase.rpc('admin_list_listings', {
    p_search: search,
    p_limit: 50,
    p_offset: 0,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function adminHideProfile(userId, hidden) {
  const { error } = await supabase.rpc('admin_hide_profile', {
    p_user_id: userId,
    p_hidden: hidden,
  })

  if (error) {
    throw error
  }
}

export async function adminSuspendUser(userId, suspended) {
  const { error } = await supabase.rpc('admin_suspend_user', {
    p_user_id: userId,
    p_suspended: suspended,
  })

  if (error) {
    throw error
  }
}

export async function adminDeleteProfile(userId) {
  const { error } = await supabase.rpc('admin_delete_profile', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }
}

export async function adminHideListing(postId, hidden) {
  const { error } = await supabase.rpc('admin_hide_listing', {
    p_post_id: postId,
    p_hidden: hidden,
  })

  if (error) {
    throw error
  }
}

export async function adminDeleteListing(postId) {
  const { error } = await supabase.rpc('admin_delete_listing', {
    p_post_id: postId,
  })

  if (error) {
    throw error
  }
}

export async function fetchAdminReports(status = 'open') {
  const { data, error } = await supabase.rpc('admin_list_reports', {
    p_status: status,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function adminResolveReport(reportId, status, adminNotes = '') {
  const { error } = await supabase.rpc('admin_resolve_report', {
    p_report_id: reportId,
    p_status: status,
    p_admin_notes: adminNotes,
  })

  if (error) {
    throw error
  }
}

export async function fetchAdminVerificationRequests(status = 'pending') {
  const { data, error } = await supabase.rpc('admin_list_verification_requests', {
    p_status: status,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function adminReviewVerification(requestId, approved, reason = '') {
  const { error } = await supabase.rpc('admin_review_verification', {
    p_request_id: requestId,
    p_approved: approved,
    p_reason: reason,
  })

  if (error) {
    throw error
  }
}

export async function fetchAdminAuditLog(limit = 100) {
  const { data, error } = await supabase.rpc('admin_list_audit_log', {
    p_limit: limit,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchAdminWelcomeEmailMembers(search = '') {
  const { data, error } = await supabase.rpc('admin_list_welcome_email_members', {
    p_search: search,
    p_limit: 50,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

async function parseFunctionError(error) {
  let details = error.message

  try {
    if (error.context) {
      const body = await error.context.json()
      details = body?.error ?? details
    }
  } catch {
    // Keep the default invoke error message.
  }

  return details
}

export async function adminSendWelcomeEmail(userId) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Sign in required')
  }

  const { data, error } = await supabase.functions.invoke('send-welcome-email', {
    body: { userId, adminSend: true },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) {
    throw new Error(await parseFunctionError(error))
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.sent) {
    throw new Error(data?.reason ?? 'Welcome email was not sent')
  }

  await supabase.rpc('log_admin_action', {
    p_action: 'send_welcome_email',
    p_target_type: 'user',
    p_target_id: userId,
    p_details: {},
  })

  return data
}

export async function submitContentReport({ targetType, targetId, reason, details = '' }) {
  const { data, error } = await supabase.rpc('submit_content_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details,
  })

  if (error) {
    throw error
  }

  notifyNewReport(data)

  return data
}

export async function submitVerificationRequest(message = '') {
  const { data, error } = await supabase.rpc('submit_verification_request', {
    p_message: message,
  })

  if (error) {
    throw error
  }

  return data
}

export async function submitFeaturedRequest(message = '') {
  const { data, error } = await supabase.rpc('submit_featured_request', {
    p_message: message,
  })

  if (error) {
    throw error
  }

  return data
}

export async function fetchAdminFeaturedRequests(status = 'pending') {
  const { data, error } = await supabase.rpc('admin_list_featured_requests', {
    p_status: status,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function adminReviewFeatured(requestId, approved, reason = '') {
  const { error } = await supabase.rpc('admin_review_featured', {
    p_request_id: requestId,
    p_approved: approved,
    p_reason: reason,
  })

  if (error) {
    throw error
  }
}

export async function fetchAdminMemberFeedback(status = 'open') {
  const { data, error } = await supabase.rpc('admin_list_member_feedback', {
    p_status: status,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function adminResolveMemberFeedback(feedbackId, adminNotes = '') {
  const { error } = await supabase.rpc('admin_resolve_member_feedback', {
    p_feedback_id: feedbackId,
    p_admin_notes: adminNotes,
  })

  if (error) {
    throw error
  }
}
