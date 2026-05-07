import { fetchNutritionStatisticsRange } from '../../statistics/model/statisticsApi'
import { localDateString } from '../../statistics/model/formatters'

export async function exportNutritionCsv(days: number): Promise<void> {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - (days - 1))

  const { points } = await fetchNutritionStatisticsRange(
    localDateString(from),
    localDateString(today),
  )

  const header = 'Date,Calories,Target,Balance,Protein (g),Fat (g),Carbs (g),Fiber (g),Weight (kg)'
  const rows = points.map(p =>
    [
      p.entryDate,
      p.consumedCalories,
      p.calorieTarget,
      p.calorieBalance,
      p.proteinGrams.toFixed(1),
      p.fatGrams.toFixed(1),
      p.carbsGrams.toFixed(1),
      p.fiberGrams.toFixed(1),
      p.weightKg != null ? p.weightKg.toFixed(1) : '',
    ].join(','),
  )

  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nutrition-${localDateString(today)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
