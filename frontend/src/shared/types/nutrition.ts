export interface TodaySummary {
  dateLabel: string
  consumedCalories: number
  dailyTargetCalories: number
  remainingCalories: number
  proteinGrams: number
  fiberGrams: number
}

export interface DraftItem {
  id: string
  name: string
  grams: number
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
