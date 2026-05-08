import { apiClient } from '../../../shared/lib/apiClient'

export type InsightKind = 'behavioral' | 'macro' | 'timing' | 'wellbeing' | 'weight' | 'other'

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

export function fetchCoachInsights(date?: string, days?: number): Promise<CoachInsightsResponse> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (days != null) params.set('days', String(days))
  const qs = params.toString()
  return apiClient.get<CoachInsightsResponse>(`/api/coach/insights${qs ? `?${qs}` : ''}`)
}

export function refreshCoachInsights(date?: string, days?: number): Promise<CoachInsightsResponse> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (days != null) params.set('days', String(days))
  const qs = params.toString()
  return apiClient.post<CoachInsightsResponse>(`/api/coach/insights/refresh${qs ? `?${qs}` : ''}`, {})
}
