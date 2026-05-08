import { apiClient } from '../../../shared/lib/apiClient'

export interface OnboardingPayload {
  ageYears: number
  gender: 'male' | 'female'
  heightCm: number
  startingWeightKg: number
  targetWeightKg?: number
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
  goal: 'lose' | 'maintain' | 'gain'
  weightLossStrategy?: 'mild' | 'optimal' | 'aggressive'
  proteinTargetG?: number
  fatTargetG?: number
  carbsTargetG?: number
  fiberTargetG?: number
  waterGoalGlasses?: number
  dailyBankCapKcal?: number
  bankMaxKcal?: number
  relaxDaysPerMonth?: number
  coachFocus?: string
}

export function submitProfile(payload: OnboardingPayload): Promise<void> {
  return apiClient.post('/api/profile', payload)
}
