import type { TodaySummary } from '../../../shared/types/nutrition'

interface SummaryItemProps {
  label: string
  value: number
  unit?: string
}

function SummaryItem({ label, value, unit }: SummaryItemProps) {
  return (
    <article className="summary-card">
      <span className="summary-card__label">{label}</span>
      <strong className="summary-card__value">
        {value}
        {unit ? <span className="summary-card__unit"> {unit}</span> : null}
      </strong>
    </article>
  )
}

interface TodaySummaryBlockProps {
  summary: TodaySummary
}

export function TodaySummaryBlock({ summary }: TodaySummaryBlockProps) {
  return (
    <section className="current-day-grid" aria-label="Today nutrition summary">
      <SummaryItem label="Consumed" value={summary.consumedCalories} unit="kcal" />
      <SummaryItem label="Remaining" value={summary.remainingCalories} unit="kcal" />
      <SummaryItem label="Protein" value={summary.proteinGrams} unit="g" />
      <SummaryItem label="Fat" value={summary.fatGrams} unit="g" />
      <SummaryItem label="Fiber" value={summary.fiberGrams} unit="g" />
    </section>
  )
}
