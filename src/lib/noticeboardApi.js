import { supabase } from './supabase'
import { DEFAULT_LISTING_DAYS } from './noticeboardConstants'
import { isUuid } from './uuid'
import { trackActivity } from './analytics'

const POST_SELECT = `
  id, user_id, section, title, body, primary_category, secondary_categories,
  location, latitude, longitude, price_amount, price_currency, price_label,
  photo_urls, status, expires_at, created_at, updated_at
`

function defaultExpiresAt(days = DEFAULT_LISTING_DAYS) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

async function attachPosters(posts) {
  if (!posts.length) {
    return []
  }

  const userIds = [...new Set(posts.map((post) => post.user_id))]

  if (!userIds.length) {
    return posts.map((post) => ({ ...post, poster: null }))
  }

  const { data: posters, error } = await supabase
    .from('profiles')
    .select('user_id, name, profile_photo_url, is_verified')
    .in('user_id', userIds)

  if (error) {
    throw error
  }

  const posterMap = Object.fromEntries((posters ?? []).map((poster) => [poster.user_id, poster]))

  return posts.map((post) => ({
    ...post,
    poster: posterMap[post.user_id] ?? null,
  }))
}

function isPostLive(post) {
  return post.status === 'active' && new Date(post.expires_at) > new Date()
}

export async function browseNoticeboardPosts({
  section = '',
  category = '',
  search = '',
  location = '',
} = {}) {
  let query = supabase
    .from('noticeboard_posts')
    .select(POST_SELECT)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (section) {
    query = query.eq('section', section)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let results = data ?? []

  if (category) {
    results = results.filter(
      (post) =>
        post.primary_category === category ||
        (post.secondary_categories ?? []).includes(category),
    )
  }

  const locationText = location.trim().toLowerCase()

  if (locationText) {
    results = results.filter((post) => post.location?.toLowerCase().includes(locationText))
  }

  const queryText = search.trim().toLowerCase()

  if (queryText) {
    results = results.filter((post) => {
      const searchable = [post.title, post.body, post.location, post.primary_category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(queryText)
    })
  }

  return attachPosters(results)
}

export async function fetchNoticeboardPost(postId) {
  if (!isUuid(postId)) {
    return null
  }

  const { data, error } = await supabase
    .from('noticeboard_posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const [post] = await attachPosters([data])
  return post
}

export async function fetchUserNoticeboardPosts(userId, { includeAll = false } = {}) {
  if (!isUuid(userId)) {
    return []
  }

  let query = supabase
    .from('noticeboard_posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.eq('status', 'active').gt('expires_at', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchMyNoticeboardPosts(userId) {
  return fetchUserNoticeboardPosts(userId, { includeAll: true })
}

export async function createNoticeboardPost(userId, payload) {
  const { data, error } = await supabase
    .from('noticeboard_posts')
    .insert({
      user_id: userId,
      section: payload.section,
      title: payload.title.trim(),
      body: payload.body.trim(),
      primary_category: payload.primary_category || null,
      secondary_categories: payload.secondary_categories ?? [],
      location: payload.location?.trim() || null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      price_amount: payload.price_amount ?? null,
      price_currency: payload.price_currency?.trim() || 'USD',
      price_label: payload.price_label?.trim() || null,
      photo_urls: payload.photo_urls ?? [],
      expires_at: payload.expires_at ?? defaultExpiresAt(),
    })
    .select(POST_SELECT)
    .single()

  if (error) {
    throw error
  }

  trackActivity('listing_create', {
    targetType: 'listing',
    targetId: data.id,
    properties: { section: data.section },
  })

  return data
}

export async function updateNoticeboardPost(postId, payload) {
  if (!isUuid(postId)) {
    throw new Error('Invalid listing id')
  }

  const { data, error } = await supabase
    .from('noticeboard_posts')
    .update({
      section: payload.section,
      title: payload.title.trim(),
      body: payload.body.trim(),
      primary_category: payload.primary_category || null,
      secondary_categories: payload.secondary_categories ?? [],
      location: payload.location?.trim() || null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      price_amount: payload.price_amount ?? null,
      price_currency: payload.price_currency?.trim() || 'USD',
      price_label: payload.price_label?.trim() || null,
      photo_urls: payload.photo_urls ?? [],
      expires_at: payload.expires_at,
    })
    .eq('id', postId)
    .select(POST_SELECT)
    .single()

  if (error) {
    throw error
  }

  trackActivity('listing_update', {
    targetType: 'listing',
    targetId: data.id,
  })

  return data
}

export async function updateNoticeboardPostStatus(postId, status) {
  if (!isUuid(postId)) {
    throw new Error('Invalid listing id')
  }

  const { data, error } = await supabase
    .from('noticeboard_posts')
    .update({ status })
    .eq('id', postId)
    .select(POST_SELECT)
    .single()

  if (error) {
    throw error
  }

  trackActivity('listing_status_change', {
    targetType: 'listing',
    targetId: data.id,
    properties: { status },
  })

  return data
}

export async function deleteNoticeboardPost(postId) {
  if (!isUuid(postId)) {
    throw new Error('Invalid listing id')
  }

  const { error } = await supabase.from('noticeboard_posts').delete().eq('id', postId)

  if (error) {
    throw error
  }

  trackActivity('listing_delete', {
    targetType: 'listing',
    targetId: postId,
  })
}

export async function uploadNoticeboardPhoto(file, userId) {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error } = await supabase.storage.from('noticeboard-photos').upload(path, file, {
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('noticeboard-photos').getPublicUrl(path)
  return data.publicUrl
}

export { isPostLive }
