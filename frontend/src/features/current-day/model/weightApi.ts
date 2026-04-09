import { LIVE_APP_USER_ID } from '../../../shared/config/appUser'
import { formatLocalDateInputValue } from '../../../shared/lib/date'

function currentEntryDate(): string {
  return formatLocalDateInputValue(new Date())
}

export async function updateTodayWeight(weightKg: number): Promise<void> {
  const response = await fetch(`/api/history/today-summary/weight?userId=${LIVE_APP_USER_ID}&entryDate=${currentEntryDate()}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ weightKg }),
  })

  if (!response.ok) {
    throw new Error(`Не удалось сохранить вес (${response.status})`)
  }
}
