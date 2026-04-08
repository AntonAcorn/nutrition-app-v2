import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, DraftTotals, PhotoAnalysisDraft } from '../../../shared/types/nutrition'

interface DraftPayload {
  id?: string
  analysis?: {
    id?: string
    items?: Array<Partial<DraftItem>>
    totals?: Partial<DraftTotals>
    notes?: string[] | string
    confidence?: number
    needsUserConfirmation?: boolean
  }
}

export const numericFields: Array<keyof DraftItem> = ['calories', 'protein', 'fat', 'carbs', 'fiber']

export function normalizeDraft(payload: DraftPayload): PhotoAnalysisDraft {
  const source = payload?.analysis ?? {}
  const items = Array.isArray(source.items)
    ? source.items.map((item, index) => ({
        id: item.id ?? `item-${index}`,
        name: item.name ?? '',
        estimatedPortion:
          typeof item.estimatedPortion === 'string' && item.estimatedPortion.trim().length > 0
            ? item.estimatedPortion.trim()
            : 'unknown',
        calories: toNumber(item.calories),
        protein: toNumber(item.protein),
        fat: toNumber(item.fat),
        carbs: toNumber(item.carbs),
        fiber: toNumber(item.fiber),
      }))
    : []

  const notes = Array.isArray(source.notes)
    ? source.notes
    : typeof source.notes === 'string'
      ? source.notes.split('\n').filter(Boolean)
      : []

  const totalsFromBackend = source.totals ?? {}
  const calculatedTotals = calculateTotals(items)

  return {
    id: payload.id ?? source.id ?? 'latest',
    items,
    totals: {
      calories: toNumber(totalsFromBackend.calories ?? calculatedTotals.calories),
      protein: toNumber(totalsFromBackend.protein ?? calculatedTotals.protein),
      fat: toNumber(totalsFromBackend.fat ?? calculatedTotals.fat),
      carbs: toNumber(totalsFromBackend.carbs ?? calculatedTotals.carbs),
      fiber: toNumber(totalsFromBackend.fiber ?? calculatedTotals.fiber),
    },
    notes,
    confidence: toNumber(source.confidence),
    needsUserConfirmation: source.needsUserConfirmation !== false,
  }
}

export function calculateTotals(items: DraftItem[]): DraftTotals {
  return items.reduce<DraftTotals>(
    (acc, item) => {
      acc.calories += toNumber(item.calories)
      acc.protein += toNumber(item.protein)
      acc.fat += toNumber(item.fat)
      acc.carbs += toNumber(item.carbs)
      acc.fiber += toNumber(item.fiber)
      return acc
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  )
}
