import { useState } from 'react'
import { RATING_OPTIONS, submitRetrospective } from '../model/wellbeingApi'

interface Props {
  onDone: () => void
}

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

const STEPS = [
  { daysAgo: 1, question: 'Yesterday, after your main meal — how did you feel?' },
  { daysAgo: 2, question: 'What about 2 days ago?' },
  { daysAgo: 3, question: 'And 3 days ago?' },
]

export function WellbeingRetrospectiveModal({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Array<{ date: string; rating: number }>>([])
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function pick(rating: number) {
    if (busy) return
    const entry = { date: getDateStr(STEPS[step].daysAgo), rating }
    const updated = [...answers, entry]

    if (step < STEPS.length - 1) {
      setAnswers(updated)
      setStep(s => s + 1)
      return
    }

    setBusy(true)
    try {
      await submitRetrospective(updated)
    } catch {}
    setDone(true)
    setTimeout(onDone, 1200)
  }

  return (
    <div className="wellbeing-overlay">
      <div className="wellbeing-modal">
        {done ? (
          <p className="wellbeing-modal__thanks">Thanks! Building your profile… ⚡</p>
        ) : (
          <>
            <div className="wellbeing-retro__header">
              <p className="wellbeing-modal__title">{STEPS[step].question}</p>
              <span className="wellbeing-retro__step">{step + 1}/{STEPS.length}</span>
            </div>
            <p className="wellbeing-modal__subtitle">Think back to how you felt 1–3 hours after eating</p>
            <div className="wellbeing-modal__buttons">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.rating}
                  type="button"
                  className="wellbeing-modal__btn"
                  onClick={() => pick(opt.rating)}
                  disabled={busy}
                >
                  <span className="wellbeing-modal__emoji">{opt.emoji}</span>
                  <span className="wellbeing-modal__label">{opt.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="wellbeing-modal__skip" onClick={onDone}>
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
