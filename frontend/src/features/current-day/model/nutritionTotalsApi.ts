import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'

export interface UpdateNutritionTotalsPayload {
  caloriesConsumedKcal: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
}

export async function updateTodayNutritionTotals(payload: UpdateNutritionTotalsPayload): Promise<void> {
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
