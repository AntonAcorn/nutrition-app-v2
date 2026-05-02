import { API_BASE } from '../../../shared/lib/apiBase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export interface PushSubscriptionStatus {
  subscribed: boolean
  enabled: boolean
  reminderHour: number
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  const res = await fetch(`${API_BASE}/api/push/subscription`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load push status')
  return res.json()
}

export async function subscribePush(reminderHour: number): Promise<PushSubscriptionStatus> {
  if (!VAPID_PUBLIC_KEY) throw new Error('Push not configured')
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) await existing.unsubscribe()
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const json = sub.toJSON()
  const res = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminderHour,
    }),
  })
  if (!res.ok) throw new Error('Failed to subscribe')
  return res.json()
}

export async function updatePushSettings(enabled: boolean, reminderHour: number): Promise<PushSubscriptionStatus> {
  const res = await fetch(`${API_BASE}/api/push/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled, reminderHour }),
  })
  if (!res.ok) throw new Error('Failed to update settings')
  return res.json()
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  await fetch(`${API_BASE}/api/push/unsubscribe`, { method: 'DELETE', credentials: 'include' })
}
