import type { NutritionStatisticsPoint } from '../../../shared/types/nutrition'

export type ChartValueKey = 'weightKg' | 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams' | 'carbsGrams'

export function buildLinePath(values: Array<number | null>, width: number, height: number, min: number, max: number): string {
  if (values.length === 0) {
    return ''
  }

  const range = Math.max(1, max - min)
  let hasStarted = false

  return values
    .map((value, index) => {
      if (value == null) {
        hasStarted = false
        return ''
      }

      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      const command = hasStarted ? 'L' : 'M'
      hasStarted = true
      return `${command} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(' ')
}

export function buildFillPath(values: Array<number | null>, width: number, height: number, min: number, max: number): string {
  const linePath = buildLinePath(values, width, height, min, max)
  if (!linePath) return ''
  let firstIdx = -1, lastIdx = -1
  for (let i = 0; i < values.length; i++) {
    if (values[i] != null) { if (firstIdx === -1) firstIdx = i; lastIdx = i }
  }
  if (firstIdx === -1) return ''
  const firstX = values.length === 1 ? width / 2 : (firstIdx / (values.length - 1)) * width
  const lastX  = values.length === 1 ? width / 2 : (lastIdx  / (values.length - 1)) * width
  return `${linePath} L ${lastX.toFixed(1)} ${height} L ${firstX.toFixed(1)} ${height} Z`
}

export function movingAvg(points: NutritionStatisticsPoint[], window = 5): Array<number | null> {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1)
    const weights = slice.map(p => p.weightKg).filter((w): w is number => w != null)
    return weights.length >= 3 ? weights.reduce((a, b) => a + b, 0) / weights.length : null
  })
}

export function getChartBounds({
  values,
  targets,
  trendline,
  valueKey,
  goalLine,
}: {
  values: Array<number | null>
  targets: Array<number | null>
  trendline?: Array<number | null>
  valueKey: ChartValueKey
  goalLine?: number | null
}): { min: number; max: number } {
  const numericValues = values.filter((value): value is number => value != null)
  const numericTargets = targets.filter((value): value is number => value != null)
  const numericTrend = (trendline ?? []).filter((v): v is number => v != null)

  if (numericValues.length === 0 && numericTargets.length === 0) {
    return { min: 0, max: 1 }
  }

  if (valueKey === 'weightKg' && numericValues.length > 0) {
    const allW = [...numericValues, ...numericTrend, ...(goalLine != null ? [goalLine] : [])]
    const rawMin = Math.min(...allW)
    const rawMax = Math.max(...allW)
    const spread = rawMax - rawMin
    const visualRange = Math.max(spread, 1.5)
    const center = (rawMin + rawMax) / 2
    const padding = Math.max(0.2, visualRange * 0.12)

    return {
      min: center - visualRange / 2 - padding,
      max: center + visualRange / 2 + padding,
    }
  }

  return {
    min: Math.min(0, ...numericValues, ...numericTargets),
    max: Math.max(1, ...numericValues, ...numericTargets),
  }
}
