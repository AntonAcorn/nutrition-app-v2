import type { TodaySummary } from '../../../shared/types/nutrition'

interface MacroCardProps {
  label: string
  value: number
  unit: string
}

function MacroCard({ label, value, unit }: MacroCardProps) {
  return (
    <article className="summary-card summary-card--macro">
      <span className="summary-card__label">{label}</span>
      <strong className="summary-card__value">
        {Math.round(value)}
        <span className="summary-card__unit"> {unit}</span>
      </strong>
    </article>
  )
}

interface TodaySummaryBlockProps {
  summary: TodaySummary
}

export function TodaySummaryBlock({ summary }: TodaySummaryBlockProps) {
  return (
    <section className="today-summary" aria-label="Сводка питания за день">
      <article className="summary-card summary-card--hero summary-card--accent">
        <div>
          <span className="summary-card__label">Осталось сегодня</span>
          <strong className="summary-card__value summary-card__value--hero">
            {Math.round(summary.remainingCalories)}
            <span className="summary-card__unit"> ккал</span>
          </strong>
          <p className="subtle-text">Съедено {Math.round(summary.consumedCalories)} из {Math.round(summary.dailyTargetCalories)}</p>
        </div>
        <div className="summary-card__meta-badge">
          <span>Цель</span>
          <strong>{Math.round(summary.dailyTargetCalories)}</strong>
        </div>
      </article>

      <div className="current-day-grid current-day-grid--macros">
        <MacroCard label="Белки" value={summary.proteinGrams} unit="г" />
        <MacroCard label="Жиры" value={summary.fatGrams} unit="г" />
        <MacroCard label="Клетчатка" value={summary.fiberGrams} unit="г" />
      </div>
    </section>
  )
}
