import { useState } from 'react'
import { RATING_OPTIONS, submitWellbeingRating } from '../model/wellbeingApi'

interface Props {
  onDismiss: () => void
  mealName?: string | null
}

export function WellbeingPrompt({ onDismiss, mealName }: Props) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleRate(rating: number) {
    if (saving) return
    setSaving(true)
    try {
      await submitWellbeingRating(rating)
      setDone(true)
      setTimeout(onDismiss, 1000)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="wellbeing-overlay" onClick={e => { if (e.target === e.currentTarget) onDismiss() }}>
      <div className="wellbeing-modal">
        {done ? (
          <p className="wellbeing-modal__thanks">Noted ✓</p>
        ) : (
          <>
            <p className="wellbeing-modal__title">
              {mealName ? `How's your energy after ${mealName}?` : 'How are you feeling?'}
            </p>
            <p className="wellbeing-modal__subtitle">
              {mealName ? 'Rate how you feel right now' : 'You ate about 2 hours ago'}
            </p>
            <div className="wellbeing-modal__buttons">
              {RATING_OPTIONS.map(({ rating, emoji, label }) => (
                <button
                  key={rating}
                  type="button"
                  className="wellbeing-modal__btn"
                  onClick={() => handleRate(rating)}
                  disabled={saving}
                >
                  <span className="wellbeing-modal__emoji">{emoji}</span>
                  <span className="wellbeing-modal__label">{label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="wellbeing-modal__skip" onClick={onDismiss}>
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
