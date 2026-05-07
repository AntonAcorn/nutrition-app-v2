import { apiClient } from '../../../shared/lib/apiClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export interface PushSubscriptionStatus {
  subscribed: boolean
  enabled: boolean
  reminderHour: number
}

async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  return apiClient.get<PushSubscriptionStatus>('/api/push/subscription')
}

async function subscribeApns(reminderHour: number): Promise<PushSubscriptionStatus> {
  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') {
    throw new Error('Push notification permission denied')
  }

  await PushNotifications.register()

  const deviceToken = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('APNs token timeout')), 15000)
    PushNotifications.addListener('registration', token => {
      clearTimeout(timeout)
      resolve(token.value)
    })
    PushNotifications.addListener('registrationError', err => {
      clearTimeout(timeout)
      reject(new Error(err.error))
    })
  })

  return apiClient.post<PushSubscriptionStatus>('/api/push/subscribe', {
    deviceToken,
    platform: 'apns',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminderHour,
  })
}

async function subscribeWebPush(reminderHour: number): Promise<PushSubscriptionStatus> {
  if (!VAPID_PUBLIC_KEY) throw new Error('Push not configured')
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) await existing.unsubscribe()
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const json = sub.toJSON()
  return apiClient.post<PushSubscriptionStatus>('/api/push/subscribe', {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    platform: 'web',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminderHour,
  })
}

export async function subscribePush(reminderHour: number): Promise<PushSubscriptionStatus> {
  if (await isNativePlatform()) {
    return subscribeApns(reminderHour)
  }
  return subscribeWebPush(reminderHour)
}

export function updatePushSettings(enabled: boolean, reminderHour: number): Promise<PushSubscriptionStatus> {
  return apiClient.put<PushSubscriptionStatus>('/api/push/settings', { enabled, reminderHour })
}

export async function unsubscribePush(): Promise<void> {
  if (await isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      await PushNotifications.removeAllListeners()
    } catch {}
  } else {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  }
  await apiClient.delete('/api/push/unsubscribe')
}

export async function isPushSupported(): Promise<boolean> {
  if (await isNativePlatform()) return true
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}
