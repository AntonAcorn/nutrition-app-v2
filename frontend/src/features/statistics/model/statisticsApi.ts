import { LIVE_APP_USER_ID } from '../../../shared/config/appUser'
import { APP_TIME_ZONE, formatLocalDateInputValue } from '../../../shared/lib/date'
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
    `/api/history/statistics?userId=${LIVE_APP_USER_ID}&fromDate=${fromDate}&toDate=${toDate}`,
  )

  if (!response.ok) {
    throw new Error(`Failed to load statistics (${response.status})`)
  }

  return (await response.json()) as NutritionStatisticsResponse
}
