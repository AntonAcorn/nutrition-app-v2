const todaySummaryMock = {
  dateLabel: 'Сегодня, 3 апреля',
  consumedCalories: 1640,
  dailyTargetCalories: 2100,
  proteinGrams: 108,
  fiberGrams: 24,
}

function normalizeSummary(summary) {
  const remainingCalories = Math.max(0, summary.dailyTargetCalories - summary.consumedCalories)

  return {
    ...summary,
    remainingCalories,
  }
}

/**
 * Temporary source for Today Summary data.
 *
 * Replace this function body with backend/API call later,
 * keeping the returned data shape stable for the UI component.
 */
export function getTodaySummaryMock() {
  return normalizeSummary(todaySummaryMock)
}
