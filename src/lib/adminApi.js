import { supabase } from './supabase'

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
