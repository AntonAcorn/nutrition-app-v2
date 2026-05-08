import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptEscalation,
  dismissCoachInsight,
  fetchCoachInsights,
  refreshCoachInsights,
  type CoachInsightsResponse,
  type InsightKind,
} from '../model/coachApi'
import { ApiError } from '../../../shared/lib/apiClient'
import { hapticLight } from '../../../shared/lib/haptic'
import { VoiceSummaryButton } from './VoiceSummaryButton'

const KIND_ICON: Record<InsightKind, string> = {
  behavioral: '🎯',
  macro: '🥩',
  timing: '⏰',
  wellbeing: '⚡',
  weight: '⚖️',
  other: '💡',
  escalation: '🚀',
}

function parseStrategyFromAnchor(anchor: string | null): string | null {
  if (!anchor) return null
  const match = /strategy:([a-z]+)/i.exec(anchor)
  return match ? match[1].toLowerCase() : null
}

interface Props {
  date: string
  days?: number
}

export function CoachInsightsCard({ date, days = 7 }: Props) {
  const queryClient = useQueryClient()
  const [rateLimited, setRateLimited] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('coach-card-collapsed') === '1' } catch { return false }
  })
  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('coach-card-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }
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

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissCoachInsight(id),
    onMutate: (id) => {
      hapticLight()
      const prev = queryClient.getQueryData<CoachInsightsResponse>(['coach-insights', date, days])
      if (prev) {
        queryClient.setQueryData<CoachInsightsResponse>(
          ['coach-insights', date, days],
          { ...prev, cards: prev.cards.filter(c => c.id !== id) }
        )
      }
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['coach-insights', date, days], ctx.prev)
    },
  })

  const escalate = useMutation({
    mutationFn: ({ id, strategy }: { id: string; strategy: string }) => {
      void id
      return acceptEscalation(strategy)
    },
    onMutate: ({ id }) => {
      hapticLight()
      const prev = queryClient.getQueryData<CoachInsightsResponse>(['coach-insights', date, days])
      if (prev) {
        queryClient.setQueryData<CoachInsightsResponse>(
          ['coach-insights', date, days],
          { ...prev, cards: prev.cards.filter(c => c.id !== id) }
        )
      }
      return { prev }
    },
    onSuccess: (_, { id }) => {
      // The card stays gone; backend marks the underlying insight by absence
      // (it'll regenerate next cycle if the user backslides). Also dismiss
      // it server-side so it doesn't reappear on re-fetch.
      dismissCoachInsight(id).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['coach-insights', date, days], ctx.prev)
    },
  })

  const data = query.data
  if (!data || data.cards.length === 0) return null

  return (
    <section
      className={`panel coach-card content-fade-in${collapsed ? ' coach-card--collapsed' : ''}`}
      style={{ animationDelay: '15ms' }}
      aria-label="Coach insights"
    >
      <header className="coach-card__header">
        <button
          type="button"
          className="coach-card__brand-toggle"
          onClick={toggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand Coach' : 'Collapse Coach'}
        >
          <span className="coach-card__brand">🧠 Coach</span>
          <span className={`coach-card__chevron${collapsed ? ' coach-card__chevron--collapsed' : ''}`} aria-hidden>▾</span>
          {collapsed && (
            <span className="coach-card__count">{data.cards.length}</span>
          )}
        </button>
        <div className="coach-card__header-actions">
          {!collapsed && <VoiceSummaryButton />}
          {!collapsed && (
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
          )}
        </div>
      </header>
      {!collapsed && <ul className="coach-card__list">
        {data.cards.map(card => {
          const escalationStrategy = card.kind === 'escalation' ? parseStrategyFromAnchor(card.anchor) : null
          return (
            <li
              key={card.id}
              className={`coach-card__item${card.kind === 'escalation' ? ' coach-card__item--escalation' : ''}`}
            >
              <span className="coach-card__icon" aria-hidden>{KIND_ICON[card.kind] ?? '💡'}</span>
              <div className="coach-card__body">
                <p className="coach-card__title">{card.title}</p>
                <p className="coach-card__text">{card.body}</p>
                {escalationStrategy && (
                  <button
                    type="button"
                    className="coach-card__cta"
                    disabled={escalate.isPending}
                    onClick={() => escalate.mutate({ id: card.id, strategy: escalationStrategy })}
                  >
                    {escalate.isPending ? 'Applying…' : `Switch to ${escalationStrategy}`}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="coach-card__dismiss"
                onClick={() => dismiss.mutate(card.id)}
                aria-label="Dismiss insight"
                title="Dismiss"
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>}
    </section>
  )
}
