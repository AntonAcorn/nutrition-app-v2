import type { NutritionStatisticsResponse } from '../../../shared/types/nutrition'

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDefaultRange() {
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(toDate.getDate() - 13)

  return {
    fromDate: formatIsoDate(fromDate),
    toDate: formatIsoDate(toDate),
  }
}

export async function fetchNutritionStatistics(): Promise<NutritionStatisticsResponse> {
  const { fromDate, toDate } = getDefaultRange()
  const response = await fetch(
    `/api/history/statistics?userId=${DEFAULT_USER_ID}&fromDate=${fromDate}&toDate=${toDate}`,
  )

  if (!response.ok) {
    throw new Error(`Не удалось загрузить statistics (${response.status})`)
  }

  return (await response.json()) as NutritionStatisticsResponse
}
