import { supabase } from './supabase'
import { isUuid } from './uuid'

const OWN_PROFILE_SELECT = '*, profile_roasters(*)'

const PUBLIC_PROFILE_SELECT = `
  id, user_id, profile_type, name, profile_photo_url, cover_image_url,
  location, latitude, longitude, primary_category, secondary_categories,
  about_bio, website, linkedin_url, instagram_url,
  job_title_role, years_of_experience, skills_specialties, certifications,
  open_to_status, languages, business_type, year_established, team_size,
  services_offered, opening_hours, total_roasting_capacity_kg,
  contract_roasting_capacity_kg, email_on_message,
  show_contact_email, show_contact_phone,
  created_at, updated_at,
  profile_roasters(*)
`

export async function uploadProfileImage(file, bucket, userId) {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function fetchProfile(userId, currentUserId = null) {
  if (!isUuid(userId)) {
    return null
  }

  const isOwnProfile = currentUserId != null && currentUserId === userId
  const selectFields = isOwnProfile ? OWN_PROFILE_SELECT : PUBLIC_PROFILE_SELECT

  const { data, error } = await supabase
    .from('profiles')
    .select(selectFields)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data?.profile_roasters) {
    data.profile_roasters.sort((a, b) => a.sort_order - b.sort_order)
  }

  return data
}

export async function saveProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
