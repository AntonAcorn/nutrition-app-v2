import { apiClient } from '../../../shared/lib/apiClient'

export interface CalorieBankSnapshot {
  bank: number
  bankUsedToday: number
  bankRemainingAfterToday: number
  todayOverrun: number
  isRelaxToday: boolean
  relaxDaysUsedThisMonth: number
  relaxDaysAllowedPerMonth: number
  dailyBankCap: number
  bankMax: number
}

export function fetchCalorieBankSnapshot(date?: string): Promise<CalorieBankSnapshot> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiClient.get<CalorieBankSnapshot>(`/api/calorie-bank/today${qs}`)
}

export function markRelaxDay(date: string): Promise<void> {
  return apiClient.post('/api/calorie-bank/relax-day', { date })
}

export function unmarkRelaxDay(date: string): Promise<void> {
  return apiClient.delete(`/api/calorie-bank/relax-day/${encodeURIComponent(date)}`)
}

export function fetchRelaxDays(month: string): Promise<string[]> {
  return apiClient.get<string[]>(`/api/calorie-bank/relax-days?month=${encodeURIComponent(month)}`)
}
