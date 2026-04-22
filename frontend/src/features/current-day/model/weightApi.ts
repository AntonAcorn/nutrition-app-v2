import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'

function currentEntryDate(): string {
  return getTodayLocalDateInputValue()
}

export async function updateTodayWeight(weightKg: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/history/today-summary/weight?entryDate=${currentEntryDate()}`, {
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
}
