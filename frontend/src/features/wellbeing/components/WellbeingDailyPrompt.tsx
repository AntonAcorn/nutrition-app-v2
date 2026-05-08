import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RATING_OPTIONS, submitWellbeingRating } from '../model/wellbeingApi'
import { hapticLight } from '../../../shared/lib/haptic'

interface Props {
  date: string
}

function storageKey(date: string) {
  return `wellbeing-rating-${date}`
}

export function WellbeingDailyPrompt({ date }: Props) {
  const queryClient = useQueryClient()
  const [rated, setRated] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(storageKey(date))
      return v ? Number(v) : null
    } catch {
      return null
    }
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey(date))
      setRated(v ? Number(v) : null)
    } catch {}
  }, [date])

  if (rated != null) return null

  async function pick(rating: number) {
    if (submitting) return
    setSubmitting(true)
    hapticLight()
    try {
      await submitWellbeingRating(rating)
      try { localStorage.setItem(storageKey(date), String(rating)) } catch {}
      setRated(rating)
      queryClient.invalidateQueries({ queryKey: ['coach-insights'] })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="panel wellbeing-prompt-card content-fade-in"
      style={{ animationDelay: '12ms' }}
      aria-label="How are you feeling?"
    >
      <p className="wellbeing-prompt-card__title">How are you feeling today?</p>
      <div className="wellbeing-prompt-card__row">
        {RATING_OPTIONS.map(({ rating, emoji, label }) => (
          <button
            key={rating}
            type="button"
            className="wellbeing-prompt-card__btn"
            disabled={submitting}
            onClick={() => pick(rating)}
            aria-label={label}
            title={label}
          >
            <span className="wellbeing-prompt-card__emoji" aria-hidden>{emoji}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
