import { apiClient } from '../../../shared/lib/apiClient'

export interface RecapSection {
  title: string
  body: string
}

export interface WeeklyRecap {
  id: string
  weekStart: string
  generatedAt: string
  source: string
  highlight: RecapSection
  trend: RecapSection
  challenge: RecapSection
  nextWeekGoal: RecapSection
  shareLine: string
}

function browserTz(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { return null }
}

function browserLocale(): string | null {
  try {
    const lang = navigator.language || (navigator.languages && navigator.languages[0])
    return lang ? lang.split('-')[0].toLowerCase() : null
  } catch { return null }
}

export function fetchLatestRecap(): Promise<WeeklyRecap | null> {
  return apiClient.get<WeeklyRecap | null>('/api/coach/recap')
}

export function generateRecap(): Promise<WeeklyRecap | null> {
  const params = new URLSearchParams()
  const tz = browserTz(); if (tz) params.set('tz', tz)
  const locale = browserLocale(); if (locale) params.set('locale', locale)
  const qs = params.toString()
  return apiClient.post<WeeklyRecap | null>(`/api/coach/recap/generate${qs ? `?${qs}` : ''}`, {})
}

export function dismissRecap(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/coach/recap/${encodeURIComponent(id)}`)
}
