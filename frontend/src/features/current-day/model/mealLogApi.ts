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

export interface MealSlot {
  slotId: string
  slotType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  sortOrder: number
  items: MealLogEntry[]
}

export const SLOT_LABELS: Record<MealSlot['slotType'], string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
}

export function defaultSlotByTime(): MealSlot['slotType'] {
  const hour = new Date().getHours()
  if (hour < 11) return 'BREAKFAST'
  if (hour < 15) return 'LUNCH'
  if (hour < 20) return 'DINNER'
  return 'SNACK'
}

export async function listMealLog(date: string): Promise<MealSlot[]> {
  const res = await fetch(`/api/history/meals?date=${date}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load meals')
  return res.json()
}

export interface UpdateMealLogEntryData {
  name?: string
  caloriesKcal?: number
  proteinG?: number
  fatG?: number
  carbsG?: number
  fiberG?: number
  slotType?: string
}

export async function updateMealLogEntry(id: string, data: UpdateMealLogEntryData): Promise<MealLogEntry> {
  const res = await fetch(`/api/history/meals/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update meal')
  return res.json()
}

export async function deleteMealLogEntry(id: string): Promise<void> {
  const res = await fetch(`/api/history/meals/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to delete meal')
}
