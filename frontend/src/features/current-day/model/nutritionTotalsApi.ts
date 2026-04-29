import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'

export interface MealPayload {
  caloriesConsumedKcal: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
}

export async function addMealManually(payload: MealPayload): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/history/today-summary/add-meal?entryDate=${getTodayLocalDateInputValue()}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to add meal (${response.status})`)
  }
}

export async function resetToday(): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/history/today-summary/reset?entryDate=${getTodayLocalDateInputValue()}`,
    {
      method: 'POST',
      credentials: 'include',
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to reset day (${response.status})`)
  }
}

export async function updateTodayNutritionTotals(payload: MealPayload): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/history/today-summary/nutrition-totals?entryDate=${getTodayLocalDateInputValue()}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to save nutrition totals (${response.status})`)
  }
}
