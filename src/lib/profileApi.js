import { supabase } from './supabase'

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

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
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
