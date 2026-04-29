import { API_BASE } from '../../../shared/lib/apiBase'
import type { OnboardingPayload } from '../../onboarding/model/profileApi'

export interface UserProfile {
  ageYears: number
  gender: string
  heightCm: number
  startingWeightKg: number
  activityLevel: string
  goal: string
  weightLossStrategy: string | null
  dailyCalorieTargetKcal: number
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/profile`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`)
  return res.json() as Promise<UserProfile>
}

export async function updateProfile(payload: OnboardingPayload): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to save profile (${res.status})`)
  return res.json() as Promise<UserProfile>
}
