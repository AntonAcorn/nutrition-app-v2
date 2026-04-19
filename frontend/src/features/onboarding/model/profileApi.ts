export interface OnboardingPayload {
  ageYears: number
  gender: 'male' | 'female'
  heightCm: number
  startingWeightKg: number
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
  goal: 'lose' | 'maintain' | 'gain'
  weightLossStrategy?: 'mild' | 'optimal' | 'aggressive'
}

export async function submitProfile(payload: OnboardingPayload): Promise<void> {
  const response = await fetch('/api/profile', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to save profile (${response.status})`)
  }
}
