import { formatLocalDateInputValue } from '../../../shared/lib/date'
import type { TodaySummary } from '../../../shared/types/nutrition'

interface TodaySummaryApiResponse {
  entryDate: string
  consumedCalories: number
  dailyTargetCalories: number
  remainingCalories: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'
const HARD_CODED_DAILY_TARGET_CALORIES = 2000

function currentEntryDate(): string {
  return formatLocalDateInputValue(new Date())
}

function formatDateLabel(entryDate: string): string {
  const date = new Date(`${entryDate}T00:00:00`)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export async function fetchTodaySummary(): Promise<TodaySummary> {
  const response = await fetch(
    `/api/history/today-summary?userId=${DEFAULT_USER_ID}&entryDate=${currentEntryDate()}`,
  )

  if (!response.ok) {
    throw new Error(`Не удалось загрузить current day summary (${response.status})`)
  }

  const payload = (await response.json()) as TodaySummaryApiResponse

  return {
    dateLabel: formatDateLabel(payload.entryDate),
    consumedCalories: payload.consumedCalories,
    dailyTargetCalories: HARD_CODED_DAILY_TARGET_CALORIES,
    remainingCalories: Math.max(0, HARD_CODED_DAILY_TARGET_CALORIES - payload.consumedCalories),
    proteinGrams: payload.proteinGrams,
    fatGrams: payload.fatGrams,
    fiberGrams: payload.fiberGrams,
  }
}
