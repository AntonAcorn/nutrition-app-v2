import { apiClient } from '../../../shared/lib/apiClient'

export interface FrequentMeal {
  name: string
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
  logCount: number
}

export function listFrequentMeals(days = 7, limit = 5): Promise<FrequentMeal[]> {
  return apiClient.get(`/api/history/meals/frequent?days=${days}&limit=${limit}`)
}
