import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dismissRecap, fetchLatestRecap, type WeeklyRecap } from '../model/recapApi'
import { hapticLight } from '../../../shared/lib/haptic'

const SECTIONS: Array<{
  key: 'highlight' | 'trend' | 'challenge' | 'nextWeekGoal'
  emoji: string
  label: string
}> = [
  { key: 'highlight',    emoji: '🏆', label: 'Highlight' },
  { key: 'trend',        emoji: '📈', label: 'Trend' },
  { key: 'challenge',    emoji: '⚠️', label: 'Challenge' },
  { key: 'nextWeekGoal', emoji: '🎯', label: 'Next week' },
]

export function WeeklyRecapCard() {
  const queryClient = useQueryClient()
  const query = useQuery<WeeklyRecap | null>({
    queryKey: ['coach-recap'],
    queryFn: fetchLatestRecap,
    staleTime: 10 * 60_000,
    retry: 1,
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissRecap(id),
    onMutate: () => { hapticLight() },
    onSuccess: () => {
      queryClient.setQueryData(['coach-recap'], null)
    },
  })

  const recap = query.data
  if (!recap) return null

  function handleShare() {
    hapticLight()
    if (navigator.share) {
      navigator.share({ text: recap!.shareLine }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(recap!.shareLine).catch(() => {})
    }
  }

  const weekStartDate = new Date(recap.weekStart + 'T00:00:00')
  const weekLabel = weekStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <section
      className="panel weekly-recap-card content-fade-in"
      style={{ animationDelay: '10ms' }}
      aria-label="Weekly recap"
    >
      <header className="weekly-recap-card__header">
        <div>
          <p className="weekly-recap-card__brand">📊 WEEK RECAP</p>
          <p className="weekly-recap-card__week">Week of {weekLabel}</p>
        </div>
        <button
          type="button"
          className="weekly-recap-card__dismiss"
          onClick={() => dismiss.mutate(recap.id)}
          aria-label="Dismiss recap"
          title="Dismiss"
        >
          ✕
        </button>
      </header>

      <ul className="weekly-recap-card__list">
        {SECTIONS.map(({ key, emoji, label }) => {
          const section = recap[key]
          if (!section || (!section.title && !section.body)) return null
          return (
            <li key={key} className="weekly-recap-card__item">
              <span className="weekly-recap-card__emoji" aria-hidden>{emoji}</span>
              <div className="weekly-recap-card__body">
                <p className="weekly-recap-card__label">{label}</p>
                <p className="weekly-recap-card__title">{section.title}</p>
                <p className="weekly-recap-card__text">{section.body}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {recap.shareLine && (
        <button type="button" className="weekly-recap-card__share" onClick={handleShare}>
          📤 Share my week
        </button>
      )}
    </section>
  )
}
