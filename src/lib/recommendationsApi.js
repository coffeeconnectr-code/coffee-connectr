import { supabase } from './supabase'

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

  return data
}
