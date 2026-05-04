import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'
import { writeWeightToHealth } from '../../../shared/lib/healthKit'

function currentEntryDate(): string {
  return getTodayLocalDateInputValue()
}

export async function updateTodayWeight(weightKg: number): Promise<void> {
  const entryDate = currentEntryDate()
  const response = await fetch(`${API_BASE}/api/history/today-summary/weight?entryDate=${entryDate}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ weightKg }),
  })

  if (!response.ok) {
    throw new Error(`Не удалось сохранить вес (${response.status})`)
  }

  writeWeightToHealth(weightKg, entryDate)
}
