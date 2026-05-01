export interface MealLogEntry {
  id: string
  name: string
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
  source: string | null
  createdAt: string
}

export async function listMealLog(date: string): Promise<MealLogEntry[]> {
  const res = await fetch(`/api/history/meals?date=${date}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load meals')
  return res.json()
}

export async function deleteMealLogEntry(id: string): Promise<void> {
  const res = await fetch(`/api/history/meals/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to delete meal')
}
