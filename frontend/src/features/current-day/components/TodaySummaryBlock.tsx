import type { TodaySummary } from '../../../shared/types/nutrition'

function getCaptionText(consumed: number, target: number, remaining: number): string {
  if (consumed === 0)           return 'A blank canvas. A legendary opportunity.'
  if (remaining > target * 0.7) return "Plenty of room. Don't waste it on salad."
  if (remaining > target * 0.4) return 'On track. Suspicious, but on track.'
  if (remaining > target * 0.15) return 'Getting tight. Choose wisely.'
  if (remaining > 0)            return 'You could still eat a small horse. A very small one.'
  if (remaining === 0)          return "Congrats, you've eaten yourself into tomorrow's problem."
  return 'Bold. Absolutely bold.'
}

interface MacroCardProps {
  label: string
  value: number
  unit: string
  progress: number
  tone: 'purple' | 'orange' | 'pink'
}

function MacroCard({ label, value, unit, progress, tone }: MacroCardProps) {
  return (
    <article className="macro-meter-card">
      <div className="macro-meter-card__header">
        <span>{label}</span>
        <strong>
          {Math.round(value)}
          <span>{unit}</span>
        </strong>
      </div>
      <div className="macro-meter-card__track">
        <span className={`macro-meter-card__fill macro-meter-card__fill--${tone}`} style={{ width: `${progress}%` }} />
      </div>
    </article>
  )
}

interface TodaySummaryBlockProps {
  summary: TodaySummary
}

export function TodaySummaryBlock({ summary }: TodaySummaryBlockProps) {
  const consumed = Math.round(summary.consumedCalories)
  const target = Math.max(1, Math.round(summary.dailyTargetCalories))
  const remaining = Math.round(summary.remainingCalories)
  const ringProgress = Math.min(100, Math.max(0, Math.round((consumed / target) * 100)))
  const circumference = 2 * Math.PI * 64
  const dashOffset = circumference - (circumference * ringProgress) / 100

  return (
    <section className="today-summary today-summary--dark" aria-label="Сводка питания за день">
      <article className="today-dark-card">
        <div className="today-dark-card__topbar today-dark-card__topbar--centered">
          <div>
            <p className="today-dark-card__title">Calories Details</p>
          </div>
        </div>

        <div className="today-dark-ring-layout">
          <div className="today-side-stat">
            <strong>{consumed}</strong>
            <span>EATEN</span>
          </div>

          <div className="today-ring">
            <svg viewBox="0 0 160 160" className="today-ring__svg" aria-hidden="true">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b7dff" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="64" className="today-ring__track" />
              <circle
                cx="80"
                cy="80"
                r="64"
                className="today-ring__progress"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="today-ring__center">
              <strong>{remaining}</strong>
              <span>kcal left</span>
            </div>
          </div>

          <div className="today-side-stat">
            <strong>{target}</strong>
            <span>TARGET</span>
          </div>
        </div>

        <p className="today-ring__caption">{getCaptionText(consumed, target, remaining)}</p>

        <div className="macro-meter-grid">
          <MacroCard label="Protein" value={summary.proteinGrams} unit="g" progress={Math.min(100, Math.round((summary.proteinGrams / 180) * 100))} tone="purple" />
          <MacroCard label="Fat" value={summary.fatGrams} unit="g" progress={Math.min(100, Math.round((summary.fatGrams / 90) * 100))} tone="orange" />
          <MacroCard label="Fiber" value={summary.fiberGrams} unit="g" progress={Math.min(100, Math.round((summary.fiberGrams / 35) * 100))} tone="pink" />
        </div>

        <div className="today-insight-card">
          <div className="today-insight-card__emoji">⚡</div>
          <h3>Today insight</h3>
          <p>
            {summary.weightKg == null
              ? 'Your scale is getting bored.'
              : `Weight logged: ${summary.weightKg.toFixed(1)} kg. Keep going.`}
          </p>
        </div>
      </article>
    </section>
  )
}
