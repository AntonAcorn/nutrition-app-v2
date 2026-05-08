import { useQuery } from '@tanstack/react-query'
import {
  fetchCoachInsights,
  type CoachInsightsResponse,
  type InsightKind,
} from '../model/coachApi'

const KIND_ICON: Record<InsightKind, string> = {
  behavioral: '🎯',
  macro: '🥩',
  timing: '⏰',
  wellbeing: '⚡',
  weight: '⚖️',
  other: '💡',
}

interface Props {
  date: string
  days?: number
}

export function CoachInsightsCard({ date, days = 7 }: Props) {
  const query = useQuery<CoachInsightsResponse>({
    queryKey: ['coach-insights', date, days],
    queryFn: () => fetchCoachInsights(date, days),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const data = query.data
  if (!data || data.cards.length === 0) return null

  return (
    <section className="panel coach-card" aria-label="Coach insights">
      <header className="coach-card__header">
        <span className="coach-card__brand">🧠 Coach</span>
      </header>
      <ul className="coach-card__list">
        {data.cards.map(card => (
          <li key={card.id} className="coach-card__item">
            <span className="coach-card__icon" aria-hidden>{KIND_ICON[card.kind] ?? '💡'}</span>
            <div className="coach-card__body">
              <p className="coach-card__title">{card.title}</p>
              <p className="coach-card__text">{card.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
