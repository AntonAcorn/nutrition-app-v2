function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatDateLabel(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date()
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function normalizeSummary(summary = {}) {
  const consumedCalories = toNumber(summary.consumedCalories)
  const dailyTargetCalories = toNumber(summary.dailyTargetCalories)

  return {
    dateLabel: formatDateLabel(summary.entryDate),
    consumedCalories,
    dailyTargetCalories,
    remainingCalories: Math.max(0, toNumber(summary.remainingCalories || dailyTargetCalories - consumedCalories)),
    proteinGrams: toNumber(summary.proteinGrams),
    fiberGrams: toNumber(summary.fiberGrams),
  }
}

export async function getTodaySummary(signal) {
  const response = await fetch('/api/history/current-day-summary', { signal })

  if (!response.ok) {
    throw new Error(`Не удалось загрузить current day summary (${response.status})`)
  }

  const payload = await response.json()
  return normalizeSummary(payload)
}
