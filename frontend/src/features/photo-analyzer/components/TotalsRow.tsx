import type { DraftTotals } from '../../../shared/types/nutrition'

interface TotalsRowProps {
  totals: DraftTotals
}

export function TotalsRow({ totals }: TotalsRowProps) {
  return (
    <div className="totals-row">
      <span>Калории: {totals.calories.toFixed(0)}</span>
      <span>Белки: {totals.protein.toFixed(1)} г</span>
      <span>Жиры: {totals.fat.toFixed(1)} г</span>
      <span>Углеводы: {totals.carbs.toFixed(1)} г</span>
      <span>Клетчатка: {totals.fiber.toFixed(1)} г</span>
    </div>
  )
}
