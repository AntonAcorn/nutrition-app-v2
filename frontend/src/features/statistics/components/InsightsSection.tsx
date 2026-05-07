import type { Insight, CalorieSuggestion } from '../model/insights'
import { SUGGESTION_COPY } from '../model/insights'

export function InsightsSection({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null
  return (
    <section className="insights-section">
      <p className="insights-section__label">Pattern insights</p>
      {insights.map(insight => (
        <div key={insight.id} className={`insight-card insight-card--${insight.tone}`}>
          <span className="insight-card__icon" aria-hidden="true">{insight.icon}</span>
          <div>
            <p className="insight-card__title">{insight.title}</p>
            <p className="insight-card__body">{insight.body}</p>
          </div>
        </div>
      ))}
    </section>
  )
}

export function CalorieSuggestionCard({ suggestion }: { suggestion: CalorieSuggestion }) {
  const copy = SUGGESTION_COPY[suggestion.status]
  return (
    <section className={`panel calorie-suggestion-card calorie-suggestion-card--${copy.tone}`}>
      <p className="insights-section__label">Calorie target</p>
      <div className="calorie-suggestion-card__body">
        <span className="insight-card__icon" aria-hidden="true">{copy.icon}</span>
        <div>
          <p className="insight-card__title">{copy.title}</p>
          <p className="insight-card__body">{copy.body(suggestion)}</p>
        </div>
      </div>
    </section>
  )
}
