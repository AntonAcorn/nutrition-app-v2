import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined

export function initAnalytics() {
  if (!key) return
  posthog.init(key, {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
  })
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  if (!key) return
  posthog.identify(userId, props)
}

export function resetAnalyticsUser() {
  if (!key) return
  posthog.reset()
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!key) return
  posthog.capture(event, props)
}
