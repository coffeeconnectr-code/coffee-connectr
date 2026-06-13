import { supabase } from './supabase'

export async function fetchFavouriteIds(userId) {
  const { data, error } = await supabase
    .from('profile_favourites')
    .select('favourite_user_id')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return new Set((data ?? []).map((row) => row.favourite_user_id))
}

export async function isFavourite(userId, favouriteUserId) {
  const { data, error } = await supabase
    .from('profile_favourites')
    .select('id')
    .eq('user_id', userId)
    .eq('favourite_user_id', favouriteUserId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function addFavourite(userId, favouriteUserId) {
  const { error } = await supabase.from('profile_favourites').insert({
    user_id: userId,
    favourite_user_id: favouriteUserId,
  })

  if (error) {
    throw error
  }
}

export async function removeFavourite(userId, favouriteUserId) {
  const { error } = await supabase
    .from('profile_favourites')
    .delete()
    .eq('user_id', userId)
    .eq('favourite_user_id', favouriteUserId)

  if (error) {
    throw error
  }
}

export async function fetchSavedProfiles(userId) {
  const { data: favourites, error } = await supabase
    .from('profile_favourites')
    .select('favourite_user_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!favourites?.length) {
    return []
  }

  const favouriteUserIds = favourites.map((row) => row.favourite_user_id)

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, user_id, name, profile_type, profile_photo_url, location, primary_category, secondary_categories, about_bio, latitude, longitude',
    )
    .in('user_id', favouriteUserIds)

  if (profileError) {
    throw profileError
  }

  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]))

  return favourites
    .map((favourite) => profileByUserId.get(favourite.favourite_user_id))
    .filter(Boolean)
}
