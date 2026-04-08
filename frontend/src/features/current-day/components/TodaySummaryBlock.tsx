import type { TodaySummary } from '../../../shared/types/nutrition'

interface SummaryItemProps {
  label: string
  value: number
  unit?: string
  tone?: 'default' | 'accent'
}

function SummaryItem({ label, value, unit, tone = 'default' }: SummaryItemProps) {
  return (
    <article className={`summary-card ${tone === 'accent' ? 'summary-card--accent' : ''}`.trim()}>
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
    <section className="current-day-grid" aria-label="Сводка питания за день">
      <SummaryItem label="Съедено" value={summary.consumedCalories} unit="ккал" />
      <SummaryItem label="Осталось" value={summary.remainingCalories} unit="ккал" tone="accent" />
      <SummaryItem label="Белки" value={summary.proteinGrams} unit="г" />
      <SummaryItem label="Жиры" value={summary.fatGrams} unit="г" />
      <SummaryItem label="Клетчатка" value={summary.fiberGrams} unit="г" />
    </section>
  )
}
