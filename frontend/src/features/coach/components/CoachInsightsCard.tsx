import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCoachInsights,
  refreshCoachInsights,
  type CoachInsightsResponse,
  type InsightKind,
} from '../model/coachApi'
import { ApiError } from '../../../shared/lib/apiClient'
import { hapticLight } from '../../../shared/lib/haptic'

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
  const queryClient = useQueryClient()
  const [rateLimited, setRateLimited] = useState(false)
  const query = useQuery<CoachInsightsResponse>({
    queryKey: ['coach-insights', date, days],
    queryFn: () => fetchCoachInsights(date, days),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const refresh = useMutation({
    mutationFn: () => refreshCoachInsights(date, days),
    onMutate: () => { hapticLight() },
    onSuccess: (data) => {
      queryClient.setQueryData<CoachInsightsResponse>(['coach-insights', date, days], data)
      setRateLimited(false)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) setRateLimited(true)
    },
  })

  const data = query.data
  if (!data || data.cards.length === 0) return null

  return (
    <section className="panel coach-card" aria-label="Coach insights">
      <header className="coach-card__header">
        <span className="coach-card__brand">🧠 Coach</span>
        <button
          type="button"
          className="coach-card__refresh"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending || rateLimited}
          aria-label="Refresh coach insights"
          title={rateLimited ? 'Try again later' : 'Refresh'}
        >
          {refresh.isPending ? '…' : '↻'}
        </button>
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
