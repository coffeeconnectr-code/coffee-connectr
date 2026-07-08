import { supabase } from './supabase'
import { notifyNewMessage } from './notificationsApi'
import { trackActivity } from './analytics'

function getOtherUserId(message, currentUserId) {
  return message.sender_id === currentUserId ? message.recipient_id : message.sender_id
}

export async function fetchConversation(currentUserId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`,
    )
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchInbox(currentUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const messages = data ?? []
  const conversationMap = new Map()

  messages.forEach((message) => {
    const partnerId = getOtherUserId(message, currentUserId)

    if (!conversationMap.has(partnerId)) {
      conversationMap.set(partnerId, {
        partnerId,
        lastMessage: message,
        unreadCount: 0,
      })
    }

    if (
      message.recipient_id === currentUserId &&
      message.sender_id === partnerId &&
      !message.read_at
    ) {
      const conversation = conversationMap.get(partnerId)
      conversation.unreadCount += 1
    }
  })

  const conversations = [...conversationMap.values()]

  if (conversations.length === 0) {
    return []
  }

  const partnerIds = conversations.map((conversation) => conversation.partnerId)

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, name, profile_photo_url, primary_category, is_verified')
    .in('user_id', partnerIds)

  if (profileError) {
    throw profileError
  }

  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]))

  return conversations
    .map((conversation) => ({
      ...conversation,
      profile: profileByUserId.get(conversation.partnerId) ?? null,
    }))
    .sort((a, b) => {
      const aTime = new Date(a.lastMessage.created_at).getTime()
      const bTime = new Date(b.lastMessage.created_at).getTime()
      return bTime - aTime
    })
}

export async function sendMessage({ senderId, recipientId, body }) {
  const trimmed = body.trim()

  if (!trimmed) {
    throw new Error('Message cannot be empty.')
  }

  if (senderId === recipientId) {
    throw new Error('You cannot message yourself.')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      body: trimmed,
    })
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .single()

  if (error) {
    throw error
  }

  notifyNewMessage(data.id)
  trackActivity('message_send', {
    targetType: 'profile',
    targetId: recipientId,
  })

  return data
}

export async function markConversationRead({ currentUserId, otherUserId }) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', currentUserId)
    .eq('sender_id', otherUserId)
    .is('read_at', null)

  if (error) {
    throw error
  }

  trackActivity('conversation_read', {
    targetType: 'profile',
    targetId: otherUserId,
  })
}

export function subscribeToConversation({ currentUserId, otherUserId, onMessage }) {
  const channel = supabase
    .channel(`messages:${currentUserId}:${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const message = payload.new
        const isParticipant =
          (message.sender_id === currentUserId && message.recipient_id === otherUserId) ||
          (message.sender_id === otherUserId && message.recipient_id === currentUserId)

        if (isParticipant) {
          onMessage(message)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
