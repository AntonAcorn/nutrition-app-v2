import type { FoodProduct } from './barcodeApi'

const STORAGE_KEY = 'qs_recent_foods'
const MAX_ITEMS = 8

export interface RecentFood {
  product: FoodProduct
  lastGrams: number
  lastUsed: number
}

export function getRecentFoods(): RecentFood[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveRecentFood(product: FoodProduct, grams: number): void {
  const existing = getRecentFoods().filter(r => r.product.name !== product.name)
  const updated: RecentFood[] = [
    { product, lastGrams: grams, lastUsed: Date.now() },
    ...existing,
  ].slice(0, MAX_ITEMS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}
