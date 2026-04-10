import type { TodaySummary } from '../../../shared/types/nutrition'

interface StatPillProps {
  label: string
  value: number
  unit: string
  accent?: 'blue' | 'pink' | 'green'
}

function StatPill({ label, value, unit, accent = 'blue' }: StatPillProps) {
  return (
    <article className={`stat-pill stat-pill--${accent}`}>
      <span className="stat-pill__label">{label}</span>
      <strong className="stat-pill__value">
        {Math.round(value)}
        <span>{unit}</span>
      </strong>
    </article>
  )
}

interface TodaySummaryBlockProps {
  summary: TodaySummary
}

export function TodaySummaryBlock({ summary }: TodaySummaryBlockProps) {
  const progressPercent = summary.dailyTargetCalories > 0
    ? Math.min(100, Math.round((summary.consumedCalories / summary.dailyTargetCalories) * 100))
    : 0

  return (
    <section className="today-summary today-summary--premium" aria-label="Сводка питания за день">
      <article className="today-hero">
        <div className="today-hero__content">
          <p className="today-hero__eyebrow">Today overview</p>
          <h2>{Math.round(summary.remainingCalories)} kcal left</h2>
          <p className="today-hero__subtitle">
            {Math.round(summary.consumedCalories)} consumed from {Math.round(summary.dailyTargetCalories)} today
          </p>

          <div className="today-progress">
            <div className="today-progress__track">
              <span className="today-progress__fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="today-progress__meta">
              <span>{progressPercent}% of goal</span>
              <strong>{Math.round(summary.dailyTargetCalories)} kcal target</strong>
            </div>
          </div>
        </div>

        <div className="today-hero__card">
          <span className="today-hero__card-label">Daily target</span>
          <strong>{Math.round(summary.dailyTargetCalories)}</strong>
          <span>kcal</span>
        </div>
      </article>

      <div className="stat-pill-grid">
        <StatPill label="Protein" value={summary.proteinGrams} unit="g" accent="blue" />
        <StatPill label="Fat" value={summary.fatGrams} unit="g" accent="pink" />
        <StatPill label="Fiber" value={summary.fiberGrams} unit="g" accent="green" />
      </div>
    </section>
  )
}
