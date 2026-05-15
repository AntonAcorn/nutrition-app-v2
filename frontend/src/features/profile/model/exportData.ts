import { Capacitor } from '@capacitor/core'
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
  const fileName = `nutrition-${localDateString(today)}.csv`

  if (Capacitor.isNativePlatform()) {
    // Native: write to Cache, then open Share sheet so the OS lets the user
    // save to Files, AirDrop, mail, etc. A raw <a download> doesn't trigger a
    // real download inside the Capacitor WebView.
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const written = await Filesystem.writeFile({
      path: fileName,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({
      title: 'Nutrition data',
      url: written.uri,
      dialogTitle: 'Save or share your nutrition CSV',
    })
    return
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
