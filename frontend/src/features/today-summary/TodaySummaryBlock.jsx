function SummaryItem({ label, value, unit }) {
  return (
    <article className="today-summary__item">
      <span className="today-summary__label">{label}</span>
      <strong className="today-summary__value">
        {value}
        {unit ? <span className="today-summary__unit"> {unit}</span> : null}
      </strong>
    </article>
  )
}

export function TodaySummaryBlock({ summary }) {
  return (
    <section className="panel today-summary" aria-label="Today nutrition summary">
      <header className="today-summary__header">
        <p className="eyebrow eyebrow--soft">Today Summary</p>
        <h2>{summary.dateLabel}</h2>
      </header>

      <div className="today-summary__grid">
        <SummaryItem label="Consumed today" value={summary.consumedCalories} unit="kcal" />
        <SummaryItem label="Daily target" value={summary.dailyTargetCalories} unit="kcal" />
        <SummaryItem label="Remaining calories" value={summary.remainingCalories} unit="kcal" />
        <SummaryItem label="Protein today" value={summary.proteinGrams} unit="g" />
        <SummaryItem label="Fiber today" value={summary.fiberGrams} unit="g" />
      </div>
    </section>
  )
}
