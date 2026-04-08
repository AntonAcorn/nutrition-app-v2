import type { TodaySummary } from '../../../shared/types/nutrition'

const todaySummaryMock = {
  dateLabel: 'Сегодня',
  consumedCalories: 1640,
  dailyTargetCalories: 2100,
  proteinGrams: 108,
  fiberGrams: 24,
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
