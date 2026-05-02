import type { TodaySummary } from '../../../shared/types/nutrition'
import type { MascotMood } from '../components/MascotSvg'

export function getMascotMood(summary: TodaySummary | null): MascotMood {
  if (!summary || summary.consumedCalories === 0) return 'neutral'

  const {
    consumedCalories,
    dailyTargetCalories,
    remainingCalories,
    waterGlasses,
    waterGoalGlasses,
    proteinGrams,
    proteinTargetGrams,
  } = summary

  const hour = new Date().getHours()
  const calorieRatio = dailyTargetCalories > 0 ? consumedCalories / dailyTargetCalories : 0
  const waterRatio = waterGoalGlasses > 0 ? waterGlasses / waterGoalGlasses : 0
  const proteinRatio = proteinTargetGrams > 0 ? proteinGrams / proteinTargetGrams : 0

  if (remainingCalories < -(dailyTargetCalories * 0.1)) return 'sad'
  if (waterRatio < 0.5 && hour >= 13) return 'thirsty'
  if (calorieRatio >= 0.9 && calorieRatio <= 1.05 && waterRatio >= 1.0 && proteinRatio >= 0.85) return 'excited'
  if (calorieRatio >= 0.8 && calorieRatio <= 1.1 && waterRatio >= 0.85) return 'great'
  if (calorieRatio >= 0.55 && waterRatio >= 0.5) return 'cheer'
  if (calorieRatio >= 0.25) return 'happy'

  return 'neutral'
}
