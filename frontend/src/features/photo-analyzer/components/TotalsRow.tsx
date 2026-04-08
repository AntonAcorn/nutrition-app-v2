import type { DraftTotals } from '../../../shared/types/nutrition'

interface TotalsRowProps {
  totals: DraftTotals
}

export function TotalsRow({ totals }: TotalsRowProps) {
  return (
    <div className="totals-row">
      <span>ккал: {totals.calories.toFixed(0)}</span>
      <span>б: {totals.protein.toFixed(1)} г</span>
      <span>ж: {totals.fat.toFixed(1)} г</span>
      <span>у: {totals.carbs.toFixed(1)} г</span>
      <span>клетч.: {totals.fiber.toFixed(1)} г</span>
    </div>
  )
}
