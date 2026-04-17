import type { DraftTotals } from '../../../shared/types/nutrition'

interface TotalsRowProps {
  totals: DraftTotals
}

function TotalCard({ label, value, unit, accent = false }: { label: string; value: number; unit: string; accent?: boolean }) {
  return (
    <article className={`summary-card ${accent ? 'summary-card--accent' : 'summary-card--macro'}`}>
      <span className="summary-card__label">{label}</span>
      <strong className="summary-card__value">
        {Math.round(value)}
        <span className="summary-card__unit"> {unit}</span>
      </strong>
    </article>
  )
}

export function TotalsRow({ totals }: TotalsRowProps) {
  return (
    <section className="current-day-grid current-day-grid--macros">
      <TotalCard label="Calories" value={totals.calories} unit="kcal" accent />
      <TotalCard label="Protein" value={totals.protein} unit="g" />
      <TotalCard label="Fat" value={totals.fat} unit="g" />
      <TotalCard label="Carbs" value={totals.carbs} unit="g" />
      <TotalCard label="Fiber" value={totals.fiber} unit="g" />
    </section>
  )
}
