import { apiClient } from '../../../shared/lib/apiClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export interface PushSubscriptionStatus {
  subscribed: boolean
  enabled: boolean
  reminderHour: number
  timezone?: string | null
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

async function subscribeNative(reminderHour: number): Promise<PushSubscriptionStatus> {
  const { Capacitor } = await import('@capacitor/core')
  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') {
    throw new Error('Push notification permission denied')
  }

  await PushNotifications.register()

  // The plugin returns an APNs token on iOS and an FCM token on Android.
  // Label them correctly so the backend dispatches to the right service.
  const platformLabel = Capacitor.getPlatform() === 'android' ? 'fcm' : 'apns'

  const deviceToken = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Push registration timeout')), 15000)
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
    platform: platformLabel,
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
    return subscribeNative(reminderHour)
  }
  return subscribeWebPush(reminderHour)
}

export function updatePushSettings(enabled: boolean, reminderHour: number): Promise<PushSubscriptionStatus> {
  return apiClient.put<PushSubscriptionStatus>('/api/push/settings', { enabled, reminderHour })
}

export function updatePushTimezone(timezone: string): Promise<PushSubscriptionStatus> {
  return apiClient.put<PushSubscriptionStatus>('/api/push/timezone', { timezone })
}

export function getCurrentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
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
  if (!('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)) {
    return false
  }
  // iOS Safari exposes PushManager but only delivers Web Push when the site is
  // installed as a PWA (Add to Home Screen, navigator.standalone === true).
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  if (isIOS && !isStandalone) return false
  return true
}
