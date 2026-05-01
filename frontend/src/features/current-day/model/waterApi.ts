import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'

export async function setWaterGlasses(glasses: number): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/history/today-summary/water?entryDate=${getTodayLocalDateInputValue()}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glasses }),
    }
  )
  if (!res.ok) throw new Error('Failed to update water')
}
