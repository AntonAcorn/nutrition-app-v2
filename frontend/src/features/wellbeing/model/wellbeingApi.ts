import { apiClient } from '../../../shared/lib/apiClient'

export interface WellbeingPendingResponse {
  pending: boolean
  lastMealName: string | null
}

export interface FoodRatingItem {
  name: string
  avgRating: number
  sampleCount: number
}

export interface WellbeingInsightsResponse {
  enoughData: boolean
  totalEntries: number
  requiredEntries: number
  energizers: FoodRatingItem[]
  drainers: FoodRatingItem[]
}

export const RATING_OPTIONS: { rating: number; emoji: string; label: string }[] = [
  { rating: 1, emoji: '🤢', label: 'Awful' },
  { rating: 2, emoji: '😴', label: 'Tired' },
  { rating: 3, emoji: '😐', label: 'Okay' },
  { rating: 4, emoji: '😌', label: 'Good' },
  { rating: 5, emoji: '⚡', label: 'Energised' },
]

export function getWellbeingPending(): Promise<WellbeingPendingResponse> {
  return apiClient.get<WellbeingPendingResponse>('/api/wellbeing/pending')
}

export function submitWellbeingRating(rating: number): Promise<void> {
  return apiClient.post('/api/wellbeing/rate', { rating })
}

export function getWellbeingInsights(): Promise<WellbeingInsightsResponse> {
  return apiClient.get<WellbeingInsightsResponse>('/api/wellbeing/insights')
}

export interface WellbeingFoodHintResponse {
  hasHint: boolean
  avgRating: number
  sampleCount: number
  tone: 'good' | 'bad' | 'neutral'
  firstTime: boolean
}

export function getFoodEnergyHint(name: string): Promise<WellbeingFoodHintResponse> {
  return apiClient.get<WellbeingFoodHintResponse>(`/api/wellbeing/food-hint?name=${encodeURIComponent(name)}`)
}

export interface WellbeingTrendDay {
  date: string
  avgRating: number
  count: number
}

export function getWellbeingTrend(days = 14): Promise<WellbeingTrendDay[]> {
  return apiClient.get<WellbeingTrendDay[]>(`/api/wellbeing/trend?days=${days}`)
}

export interface WellbeingNudgeResponse {
  hasNudge: boolean
  message: string | null
}

export function getWellbeingNudge(): Promise<WellbeingNudgeResponse> {
  return apiClient.get<WellbeingNudgeResponse>('/api/wellbeing/nudge')
}

export function submitRetrospective(entries: Array<{ date: string; rating: number }>): Promise<void> {
  return apiClient.post('/api/wellbeing/retrospective', { entries })
}
