import type { TodaySummary } from '../../../shared/types/nutrition'

const todaySummaryMock = {
  dateLabel: 'Сегодня',
  weightKg: null,
  consumedCalories: 1640,
  dailyTargetCalories: 2000,
  proteinGrams: 108,
  fatGrams: 60,
  fiberGrams: 24,
  carbsGrams: 180,
}

function normalizeSummary(summary: Omit<TodaySummary, 'remainingCalories'>): TodaySummary {
  const remainingCalories = Math.max(0, summary.dailyTargetCalories - summary.consumedCalories)

  return {
    ...summary,
    remainingCalories,
  }
}

export function getTodaySummaryMock(): TodaySummary {
  return normalizeSummary(todaySummaryMock)
}
