import { apiClient } from '../../../shared/lib/apiClient'

export function setWaterGlasses(glasses: number, date: string): Promise<void> {
  return apiClient.put(`/api/history/today-summary/water?entryDate=${date}`, { glasses })
}
