import { apiClient } from '../../../shared/lib/apiClient'

export interface MealPayload {
  caloriesConsumedKcal: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
  carbsGrams?: number
  mealName?: string
  slotType?: string
}

export function addMealManually(payload: MealPayload, date: string): Promise<void> {
  return apiClient.post(`/api/history/today-summary/add-meal?entryDate=${date}`, payload)
}

export function resetToday(date: string): Promise<void> {
  return apiClient.post(`/api/history/today-summary/reset?entryDate=${date}`)
}

export function updateTodayNutritionTotals(payload: MealPayload, date: string): Promise<void> {
  return apiClient.put(`/api/history/today-summary/nutrition-totals?entryDate=${date}`, payload)
}
