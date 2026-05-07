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
}

export function fetchProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/api/profile')
}

export function updateProfile(payload: OnboardingPayload): Promise<UserProfile> {
  return apiClient.put<UserProfile>('/api/profile', payload)
}
