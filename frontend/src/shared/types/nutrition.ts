export interface TodaySummary {
  dateLabel: string
  weightKg: number | null
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

export interface MealTemplateItem {
  name: string
  estimatedPortion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface MealTemplate {
  id: string
  name: string
  items: MealTemplateItem[]
  totalCalories: number
  totalProtein: number
  totalFat: number
  totalFiber: number
  totalCarbs: number
  createdAt: string
  updatedAt: string
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
  carbsGrams: number
}

export interface NutritionBalanceSummary {
  consumedCalories: number
  targetCalories: number
  calorieBalance: number
}

export interface NutritionStatisticsResponse {
  userId?: string
  fromDate: string
  toDate: string
  selectedPeriodSummary: NutritionBalanceSummary
  weeklySummary: NutritionBalanceSummary
  monthlySummary: NutritionBalanceSummary
  weeklyAverageWeightKg: number | null
  monthlyAverageWeightKg: number | null
  points: NutritionStatisticsPoint[]
}
