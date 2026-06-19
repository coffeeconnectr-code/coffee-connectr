import { supabase } from './supabase'

const STORAGE_KEY = 'freeProfileInviteToken'

export function storeFreeProfileInviteToken(token) {
  const trimmed = token?.trim()

  if (!trimmed) {
    return
  }

  sessionStorage.setItem(STORAGE_KEY, trimmed)
}

export async function redeemStoredFreeProfileInvite() {
  const token = sessionStorage.getItem(STORAGE_KEY)

  if (!token) {
    return null
  }

  const { data, error } = await supabase.rpc('redeem_free_profile_invite', {
    p_token: token,
  })

  if (error) {
    console.warn('Free profile invite redemption failed:', error.message)
    return null
  }

  if (data?.redeemed) {
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return data
}
