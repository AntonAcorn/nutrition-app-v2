import { API_BASE } from '../../../shared/lib/apiBase'

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
  const res = await fetch(`${API_BASE}/api/food-lookup/barcode/${encodeURIComponent(barcode)}`, {
    credentials: 'include',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Barcode lookup failed (${res.status})`)
  return res.json() as Promise<FoodProduct>
}

export async function searchFood(query: string): Promise<FoodProduct[]> {
  if (!query || query.trim().length < 2) return []
  const res = await fetch(`${API_BASE}/api/food-lookup/search?q=${encodeURIComponent(query.trim())}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Food search failed (${res.status})`)
  return res.json() as Promise<FoodProduct[]>
}
