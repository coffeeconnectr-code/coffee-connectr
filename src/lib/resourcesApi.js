import { supabase } from './supabase'
import { isUuid } from './uuid'

const RESOURCE_SELECT = `
  id, user_id, post_type, title, description, topic,
  external_url, document_url, file_name, file_size,
  status, created_at, updated_at
`

async function attachPosters(resources) {
  if (!resources.length) {
    return []
  }

  const userIds = [...new Set(resources.map((resource) => resource.user_id))]

  const { data: posters, error } = await supabase
    .from('profiles')
    .select('user_id, name, profile_photo_url, is_verified')
    .in('user_id', userIds)

  if (error) {
    throw error
  }

  const posterMap = Object.fromEntries((posters ?? []).map((poster) => [poster.user_id, poster]))

  return resources.map((resource) => ({
    ...resource,
    poster: posterMap[resource.user_id] ?? null,
  }))
}

export function isResourceActive(resource) {
  return resource.status === 'active'
}

export async function browseResourcePosts({
  postType = '',
  topic = '',
  search = '',
} = {}) {
  let query = supabase
    .from('resource_posts')
    .select(RESOURCE_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (postType) {
    query = query.eq('post_type', postType)
  }

  if (topic) {
    query = query.eq('topic', topic)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let results = data ?? []

  const queryText = search.trim().toLowerCase()

  if (queryText) {
    results = results.filter((resource) => {
      const searchable = [resource.title, resource.description, resource.topic, resource.file_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(queryText)
    })
  }

  return attachPosters(results)
}

export async function fetchResourcePost(resourceId) {
  if (!isUuid(resourceId)) {
    return null
  }

  const { data, error } = await supabase
    .from('resource_posts')
    .select(RESOURCE_SELECT)
    .eq('id', resourceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const [resource] = await attachPosters([data])
  return resource
}

export async function fetchUserResourcePosts(userId, { includeAll = false } = {}) {
  if (!isUuid(userId)) {
    return []
  }

  let query = supabase
    .from('resource_posts')
    .select(RESOURCE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.eq('status', 'active')
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createResourcePost(userId, payload) {
  const { data, error } = await supabase
    .from('resource_posts')
    .insert({
      user_id: userId,
      post_type: payload.post_type,
      title: payload.title.trim(),
      description: payload.description.trim(),
      topic: payload.topic,
      external_url: payload.external_url?.trim() || null,
      document_url: payload.document_url?.trim() || null,
      file_name: payload.file_name?.trim() || null,
      file_size: payload.file_size ?? null,
    })
    .select(RESOURCE_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateResourcePost(resourceId, payload) {
  if (!isUuid(resourceId)) {
    throw new Error('Invalid resource id')
  }

  const { data, error } = await supabase
    .from('resource_posts')
    .update({
      post_type: payload.post_type,
      title: payload.title.trim(),
      description: payload.description.trim(),
      topic: payload.topic,
      external_url: payload.external_url?.trim() || null,
      document_url: payload.document_url?.trim() || null,
      file_name: payload.file_name?.trim() || null,
      file_size: payload.file_size ?? null,
    })
    .eq('id', resourceId)
    .select(RESOURCE_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateResourcePostStatus(resourceId, status) {
  if (!isUuid(resourceId)) {
    throw new Error('Invalid resource id')
  }

  const { data, error } = await supabase
    .from('resource_posts')
    .update({ status })
    .eq('id', resourceId)
    .select(RESOURCE_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteResourcePost(resourceId) {
  if (!isUuid(resourceId)) {
    throw new Error('Invalid resource id')
  }

  const { error } = await supabase.from('resource_posts').delete().eq('id', resourceId)

  if (error) {
    throw error
  }
}

export async function uploadResourceDocument(file, userId) {
  const extension = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error } = await supabase.storage.from('resource-documents').upload(path, file, {
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('resource-documents').getPublicUrl(path)
  return data.publicUrl
}
