import { apiClient, ApiError } from '../../../shared/lib/apiClient'

export interface FoodProduct {
  name: string
  barcode: string
  caloriesPer100g: number | null
  proteinPer100g: number | null
  fatPer100g: number | null
  carbsPer100g: number | null
  fiberPer100g: number | null
}

export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  try {
    return await apiClient.get<FoodProduct>(`/api/food-lookup/barcode/${encodeURIComponent(barcode)}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export function searchFood(query: string): Promise<FoodProduct[]> {
  if (!query || query.trim().length < 2) return Promise.resolve([])
  return apiClient.get<FoodProduct[]>(`/api/food-lookup/search?q=${encodeURIComponent(query.trim())}`)
}
