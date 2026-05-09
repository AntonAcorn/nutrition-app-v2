import { useEffect, useState, type ReactNode } from 'react'
import { hapticLight } from '../../../shared/lib/haptic'
import {
  WeekScanAnimation,
  PatternCardAnimation,
  PushAnimation,
  FocusTagsAnimation,
  BankAnimation,
} from './CoachTourAnimations'

interface Slide {
  visual: ReactNode
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    visual: <BankAnimation />,
    title: 'Your bank is open',
    body: 'Every kcal under target deposits. Bad day? Withdraw up to 200 — your streak holds. Plus 3 free-pass relax days a month for real life.',
  },
  {
    visual: <WeekScanAnimation />,
    title: 'Coach watches your week',
    body: 'Every meal, weight, and rating you log feeds a snapshot of the last 14 days. Coach reads it the way a smart friend would — looking for patterns, not just totals.',
  },
  {
    visual: <PatternCardAnimation />,
    title: 'It finds things you can\'t see',
    body: 'Like "Wednesdays you run 30% over target", or "after late dinners your wellbeing drops 1.5 stars". Patterns the dashboard alone won\'t show.',
  },
  {
    visual: <PushAnimation />,
    title: 'It reaches out at the right time',
    body: 'When a streak breaks, when sleep was rough, when the week was strong — Coach pushes a quiet, specific note. No generic reminders, no daily spam.',
  },
  {
    visual: <FocusTagsAnimation />,
    title: 'It adapts to you',
    body: 'You picked what to track in onboarding — energy, mood, weight, performance. Coach prioritizes those. Tap "Edit profile" anytime to change focus.',
  },
]

interface Props {
  onClose: () => void
}

const STORAGE_KEY = 'coach-tour-seen-v1'

export function shouldShowCoachTourOnce(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

export function markCoachTourSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
}

export function CoachTour({ onClose }: Props) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && !isLast) setIndex(i => i + 1)
      if (e.key === 'ArrowLeft' && index > 0) setIndex(i => i - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, isLast, index])

  function next() {
    hapticLight()
    if (isLast) onClose()
    else setIndex(i => i + 1)
  }
  function prev() {
    hapticLight()
    if (index > 0) setIndex(i => i - 1)
  }

  return (
    <div className="coach-tour-backdrop" onClick={onClose}>
      <div
        className="coach-tour"
        role="dialog"
        aria-label="How Coach works"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="coach-tour__skip" onClick={onClose}>
          {isLast ? 'Done' : 'Skip'}
        </button>

        <div className="coach-tour__body" key={index}>
          {slide.visual}
          <h2 className="coach-tour__title">{slide.title}</h2>
          <p className="coach-tour__text">{slide.body}</p>
        </div>

        <div className="coach-tour__dots">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`coach-tour__dot${i === index ? ' coach-tour__dot--active' : ''}`}
              aria-hidden
            />
          ))}
        </div>

        <div className="coach-tour__actions">
          <button
            type="button"
            className="coach-tour__back"
            onClick={prev}
            disabled={index === 0}
          >
            ←
          </button>
          <button type="button" className="coach-tour__next" onClick={next}>
            {isLast ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
