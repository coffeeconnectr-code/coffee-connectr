import { supabase } from './supabase'

const SESSION_KEY_STORAGE = 'cc_analytics_session_key'
const HEARTBEAT_SECONDS = 30
const FLUSH_INTERVAL_MS = 5000
const MAX_BATCH_SIZE = 25

let sessionKey = null
let eventQueue = []
let flushTimer = null
let heartbeatTimer = null
let currentPagePath = null
let trackingEnabled = false

function getSessionKey() {
  if (!sessionKey) {
    sessionKey = sessionStorage.getItem(SESSION_KEY_STORAGE)

    if (!sessionKey) {
      sessionKey = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY_STORAGE, sessionKey)
    }
  }

  return sessionKey
}

function scheduleFlush() {
  if (flushTimer) {
    return
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushEvents()
  }, FLUSH_INTERVAL_MS)
}

async function flushEvents() {
  if (!trackingEnabled || eventQueue.length === 0) {
    return
  }

  const batch = eventQueue.splice(0, MAX_BATCH_SIZE)

  try {
    await supabase.rpc('log_user_activity_events', {
      p_events: batch,
    })
  } catch {
    eventQueue.unshift(...batch)
  }

  if (eventQueue.length > 0) {
    scheduleFlush()
  }
}

async function sendHeartbeat() {
  if (!trackingEnabled || document.visibilityState !== 'visible') {
    return
  }

  try {
    await supabase.rpc('upsert_user_activity_session', {
      p_session_key: getSessionKey(),
      p_page_path: currentPagePath,
      p_duration_seconds: HEARTBEAT_SECONDS,
    })
  } catch {
    // Ignore heartbeat failures so analytics never blocks the app.
  }
}

function startHeartbeat() {
  stopHeartbeat()
  void sendHeartbeat()

  heartbeatTimer = window.setInterval(() => {
    void sendHeartbeat()
  }, HEARTBEAT_SECONDS * 1000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export function setAnalyticsUser(userId) {
  const nextEnabled = Boolean(userId)

  if (trackingEnabled && !nextEnabled) {
    void flushEvents()
    void sendHeartbeat()
    stopHeartbeat()
  }

  trackingEnabled = nextEnabled

  if (trackingEnabled) {
    startHeartbeat()
  }
}

export function trackActivity(
  eventName,
  {
    pagePath = currentPagePath,
    targetType = null,
    targetId = null,
    properties = {},
  } = {},
) {
  if (!trackingEnabled || !eventName) {
    return
  }

  eventQueue.push({
    event_name: eventName,
    page_path: pagePath,
    session_key: getSessionKey(),
    target_type: targetType,
    target_id: targetId,
    properties,
  })

  scheduleFlush()
}

export function trackPageView(pathname) {
  currentPagePath = pathname
  trackActivity('page_view', { pagePath: pathname })
}

export function flushAnalytics() {
  void flushEvents()
  void sendHeartbeat()
}
