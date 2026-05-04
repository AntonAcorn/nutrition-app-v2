import { API_BASE } from '../../../shared/lib/apiBase'
import { writeWeightToHealth } from '../../../shared/lib/healthKit'

export async function updateTodayWeight(weightKg: number, date: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/history/today-summary/weight?entryDate=${date}`, {
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

  writeWeightToHealth(weightKg, date)
}
