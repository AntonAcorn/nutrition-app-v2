import { API_BASE } from '../../../shared/lib/apiBase'
import type { TodaySummary } from '../../../shared/types/nutrition'

interface TodaySummaryApiResponse {
  entryDate: string
  weightKg: number | null
  weightUpdatedAt: string | null
  consumedCalories: number
  dailyTargetCalories: number
  remainingCalories: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
  carbsGrams: number
  proteinTargetGrams: number
  fatTargetGrams: number
  carbsTargetGrams: number
  fiberTargetGrams: number
  waterGlasses: number
  waterGoalGlasses: number
  targetWeightKg: number | null
  startingWeightKg: number | null
  loggingStreakDays: number
  weightTrend7d: number | null
}

function formatDateLabel(entryDate: string): string {
  const date = new Date(`${entryDate}T00:00:00`)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export async function fetchTodaySummary(date: string): Promise<TodaySummary> {
  const response = await fetch(
    `${API_BASE}/api/history/today-summary?entryDate=${date}`,
    { credentials: 'include' },
  )

  if (!response.ok) {
    throw new Error(`Failed to load daily summary (${response.status})`)
  }

  const payload = (await response.json()) as TodaySummaryApiResponse

  return {
    dateLabel: formatDateLabel(payload.entryDate),
    weightKg: payload.weightKg,
    weightUpdatedAt: payload.weightUpdatedAt ?? null,
    consumedCalories: payload.consumedCalories,
    dailyTargetCalories: payload.dailyTargetCalories,
    remainingCalories: payload.remainingCalories,
    proteinGrams: payload.proteinGrams,
    fatGrams: payload.fatGrams,
    fiberGrams: payload.fiberGrams,
    carbsGrams: payload.carbsGrams,
    proteinTargetGrams: payload.proteinTargetGrams ?? 150,
    fatTargetGrams: payload.fatTargetGrams ?? 60,
    carbsTargetGrams: payload.carbsTargetGrams ?? 200,
    fiberTargetGrams: payload.fiberTargetGrams ?? 25,
    waterGlasses: payload.waterGlasses ?? 0,
    waterGoalGlasses: payload.waterGoalGlasses ?? 4,
    targetWeightKg: payload.targetWeightKg ?? null,
    startingWeightKg: payload.startingWeightKg ?? null,
    loggingStreakDays: payload.loggingStreakDays ?? 0,
    weightTrend7d: payload.weightTrend7d ?? null,
  }
}
