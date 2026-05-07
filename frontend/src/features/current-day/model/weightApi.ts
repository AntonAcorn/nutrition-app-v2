import { apiClient } from '../../../shared/lib/apiClient'
import { writeWeightToHealth } from '../../../shared/lib/healthKit'

export async function updateTodayWeight(weightKg: number, date: string): Promise<void> {
  await apiClient.put(`/api/history/today-summary/weight?entryDate=${date}`, { weightKg })
  writeWeightToHealth(weightKg, date)
}
