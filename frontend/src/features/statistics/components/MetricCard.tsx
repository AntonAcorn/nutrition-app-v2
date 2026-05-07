interface MetricCardProps {
  title: string
  value: string
  detail: string
  tone?: 'neutral' | 'good' | 'bad'
  emoji?: string
}

export function MetricCard({ title, value, detail, tone = 'neutral', emoji = '•' }: MetricCardProps) {
  return (
    <section className={`stats-metric-card stats-metric-card--${tone}`}>
      <div className="stats-metric-card__top">
        <span>{title}</span>
        <span className="stats-metric-card__emoji" aria-hidden="true">{emoji}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  )
}
