import { apiClient } from '../../../shared/lib/apiClient'
import type { OnboardingPayload } from '../../onboarding/model/profileApi'

export interface UserProfile {
  ageYears: number
  gender: string
  heightCm: number
  startingWeightKg: number
  targetWeightKg: number | null
  activityLevel: string
  goal: string
  weightLossStrategy: string | null
  dailyCalorieTargetKcal: number
  proteinTargetG: number
  fatTargetG: number
  carbsTargetG: number
  fiberTargetG: number
  waterGoalGlasses: number
  dailyBankCapKcal: number
  bankMaxKcal: number
  relaxDaysPerMonth: number
  coachFocus: string | null
}

export type CoachFocusTag = 'energy' | 'mood' | 'weight' | 'performance'

export const COACH_FOCUS_TAGS: { tag: CoachFocusTag; emoji: string; label: string; hint: string }[] = [
  { tag: 'energy',      emoji: '⚡',  label: 'Energy',      hint: 'Feel sharper, less afternoon dip' },
  { tag: 'mood',        emoji: '🙂', label: 'Mood',        hint: 'Steadier days, fewer crashes' },
  { tag: 'weight',      emoji: '⚖️', label: 'Weight',      hint: 'Lose, gain or hold steady' },
  { tag: 'performance', emoji: '🏃', label: 'Performance', hint: 'Train harder, recover better' },
]

export function parseCoachFocus(raw: string | null | undefined): CoachFocusTag[] {
  if (!raw) return []
  return raw.split(',')
    .map(s => s.trim().toLowerCase())
    .filter((s): s is CoachFocusTag =>
      s === 'energy' || s === 'mood' || s === 'weight' || s === 'performance'
    )
}

export function serializeCoachFocus(tags: CoachFocusTag[]): string | null {
  if (!tags || tags.length === 0) return null
  return Array.from(new Set(tags)).join(',')
}

export function fetchProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/api/profile')
}

export function updateProfile(payload: OnboardingPayload): Promise<UserProfile> {
  return apiClient.put<UserProfile>('/api/profile', payload)
}
