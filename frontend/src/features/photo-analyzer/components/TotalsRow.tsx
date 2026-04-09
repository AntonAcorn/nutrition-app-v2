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
      <TotalCard label="Калории" value={totals.calories} unit="ккал" accent />
      <TotalCard label="Белки" value={totals.protein} unit="г" />
      <TotalCard label="Жиры" value={totals.fat} unit="г" />
      <TotalCard label="Углеводы" value={totals.carbs} unit="г" />
      <TotalCard label="Клетчатка" value={totals.fiber} unit="г" />
    </section>
  )
}
