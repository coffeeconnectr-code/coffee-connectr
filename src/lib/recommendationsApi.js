import { supabase } from './supabase'
import { parseRecommendationStats } from './recommendationStats'
import { trackActivity } from './analytics'

export async function submitBusinessRecommendation(payload) {
  const { data, error } = await supabase.functions.invoke('send-business-recommendation', {
    body: payload,
  })

  if (error) {
    throw error
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  trackActivity('recommendation_submit', {
    properties: { businessName: payload.businessName ?? null },
  })

  return data
}

export async function fetchRecommendationStats() {
  const { data, error } = await supabase.rpc('get_my_recommendation_stats')

  if (error) {
    throw error
  }

  return parseRecommendationStats(data)
}
