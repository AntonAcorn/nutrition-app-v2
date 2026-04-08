export interface TodaySummary {
  dateLabel: string
  weightKg: number | null
  consumedCalories: number
  dailyTargetCalories: number
  remainingCalories: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
}

export interface DraftItem {
  id: string
  name: string
  estimatedPortion: string
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

export interface DraftTotals {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

export interface PhotoAnalysisDraft {
  id: string
  items: DraftItem[]
  totals: DraftTotals
  notes: string[]
  confidence: number
  needsUserConfirmation: boolean
}

export interface NutritionStatisticsPoint {
  entryDate: string
  weightKg: number | null
  consumedCalories: number
  calorieTarget: number
  calorieBalance: number
  proteinGrams: number
  fatGrams: number
  fiberGrams: number
}

export interface NutritionBalanceSummary {
  consumedCalories: number
  targetCalories: number
  calorieBalance: number
}

export interface NutritionStatisticsResponse {
  userId: string
  fromDate: string
  toDate: string
  selectedPeriodSummary: NutritionBalanceSummary
  weeklySummary: NutritionBalanceSummary
  monthlySummary: NutritionBalanceSummary
  weeklyAverageWeightKg: number | null
  monthlyAverageWeightKg: number | null
  points: NutritionStatisticsPoint[]
}
