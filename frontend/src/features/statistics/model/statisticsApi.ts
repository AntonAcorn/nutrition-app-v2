import { SEEDED_HISTORY_USER_ID } from '../../../shared/config/appUser'
import { formatLocalDateInputValue } from '../../../shared/lib/date'
import type { NutritionStatisticsResponse } from '../../../shared/types/nutrition'

function getRange(days: number) {
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(toDate.getDate() - (days - 1))

  return {
    fromDate: formatLocalDateInputValue(fromDate),
    toDate: formatLocalDateInputValue(toDate),
  }
}

export async function fetchNutritionStatistics(days: number): Promise<NutritionStatisticsResponse> {
  const { fromDate, toDate } = getRange(days)
  const response = await fetch(
    `/api/history/statistics?userId=${SEEDED_HISTORY_USER_ID}&fromDate=${fromDate}&toDate=${toDate}`,
  )

  if (!response.ok) {
    throw new Error(`Не удалось загрузить statistics (${response.status})`)
  }

  return (await response.json()) as NutritionStatisticsResponse
}
