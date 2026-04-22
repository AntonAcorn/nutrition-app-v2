import { APP_TIME_ZONE, formatLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'
import type { NutritionStatisticsResponse } from '../../../shared/types/nutrition'

function getRange(days: number) {
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - (days - 1))

  return {
    fromDate: formatLocalDateInputValue(fromDate, APP_TIME_ZONE),
    toDate: formatLocalDateInputValue(toDate, APP_TIME_ZONE),
  }
}

export async function fetchNutritionStatistics(days: number): Promise<NutritionStatisticsResponse> {
  const { fromDate, toDate } = getRange(days)
  const response = await fetch(
    `${API_BASE}/api/history/statistics?fromDate=${fromDate}&toDate=${toDate}`,
    { credentials: 'include' },
  )

  if (!response.ok) {
    throw new Error(`Failed to load statistics (${response.status})`)
  }

  return (await response.json()) as NutritionStatisticsResponse
}
