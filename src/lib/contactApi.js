import { supabase } from './supabase'
import { isUuid } from './uuid'

export async function fetchProfileContact(profileUserId) {
  if (!isUuid(profileUserId)) {
    return { email: null, phone: null }
  }

  const { data, error } = await supabase.rpc('get_profile_contact', {
    target_user_id: profileUserId,
  })

  if (error) {
    throw error
  }

  const contact = Array.isArray(data) ? data[0] : data

  return {
    email: contact?.contact_email ?? null,
    phone: contact?.contact_phone ?? null,
  }
}

export function profileSharesContact(profile) {
  if (!profile) {
    return false
  }

  const hasEmail = profile.show_contact_email && Boolean(profile.contact_email?.trim())
  const hasPhone = profile.show_contact_phone && Boolean(profile.contact_phone?.trim())

  return hasEmail || hasPhone
}

export function profileMayShareContact(profile) {
  if (!profile) {
    return false
  }

  return Boolean(profile.show_contact_email || profile.show_contact_phone)
}

export async function fetchProfileContactStats(profileUserId) {
  if (!isUuid(profileUserId)) {
    return { contactedCount: 0, contactedByCount: 0 }
  }

  const { data, error } = await supabase.rpc('get_profile_contact_stats', {
    target_user_id: profileUserId,
  })

  if (error) {
    throw error
  }

  return {
    contactedCount: data?.contacted_count ?? 0,
    contactedByCount: data?.contacted_by_count ?? 0,
  }
}
