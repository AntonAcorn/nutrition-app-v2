import { getTodayLocalDateInputValue } from '../../../shared/lib/date'

function currentEntryDate(): string {
  return getTodayLocalDateInputValue()
}

export async function updateTodayWeight(weightKg: number): Promise<void> {
  const response = await fetch(`/api/history/today-summary/weight?entryDate=${currentEntryDate()}`, {
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
