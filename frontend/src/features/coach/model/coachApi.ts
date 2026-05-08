import { apiClient } from '../../../shared/lib/apiClient'

export type InsightKind = 'behavioral' | 'macro' | 'timing' | 'wellbeing' | 'weight' | 'other' | 'escalation'

export interface CoachInsightCard {
  id: string
  kind: InsightKind
  title: string
  body: string
  anchor: string | null
}

export interface CoachInsightsResponse {
  generatedAt: string
  validUntil: string
  snapshotWindowDays: number
  source: string
  cards: CoachInsightCard[]
}

function browserTz(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

function browserLocale(): string | null {
  try {
    const lang = navigator.language || (navigator.languages && navigator.languages[0])
    if (!lang) return null
    return lang.split('-')[0].toLowerCase() || null
  } catch {
    return null
  }
}

function buildQuery(date?: string, days?: number): string {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (days != null) params.set('days', String(days))
  const tz = browserTz()
  if (tz) params.set('tz', tz)
  const locale = browserLocale()
  if (locale) params.set('locale', locale)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function fetchCoachInsights(date?: string, days?: number): Promise<CoachInsightsResponse> {
  return apiClient.get<CoachInsightsResponse>(`/api/coach/insights${buildQuery(date, days)}`)
}

export function refreshCoachInsights(date?: string, days?: number): Promise<CoachInsightsResponse> {
  return apiClient.post<CoachInsightsResponse>(`/api/coach/insights/refresh${buildQuery(date, days)}`, {})
}

export function dismissCoachInsight(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/coach/insights/${encodeURIComponent(id)}`)
}

export function acceptEscalation(strategy: string): Promise<void> {
  return apiClient.post<void>(
    `/api/coach/escalation/accept?strategy=${encodeURIComponent(strategy)}`,
    {}
  )
}

export type InlineTipTone = 'good' | 'caution' | 'over' | 'muted'

export interface InlineTip {
  tone: InlineTipTone
  text: string | null
  kcalAfter: number | null
  kcalTarget: number | null
}

export function fetchInlineTip(kcal: number, slotType?: string): Promise<InlineTip> {
  const params = new URLSearchParams()
  const tz = browserTz()
  if (tz) params.set('tz', tz)
  const qs = params.toString()
  return apiClient.post<InlineTip>(
    `/api/coach/inline-tip${qs ? `?${qs}` : ''}`,
    { kcal, slotType: slotType ?? null }
  )
}
