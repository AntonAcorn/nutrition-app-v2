import { APP_TIME_ZONE, formatLocalDateInputValue } from '../../../shared/lib/date'
import { apiClient } from '../../../shared/lib/apiClient'
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

export function fetchNutritionStatistics(days: number): Promise<NutritionStatisticsResponse> {
  const { fromDate, toDate } = getRange(days)
  return apiClient.get<NutritionStatisticsResponse>(`/api/history/statistics?fromDate=${fromDate}&toDate=${toDate}`)
}

export function fetchNutritionStatisticsRange(from: string, to: string): Promise<NutritionStatisticsResponse> {
  return apiClient.get<NutritionStatisticsResponse>(`/api/history/statistics?fromDate=${from}&toDate=${to}`)
}
