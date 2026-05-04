import { useEffect, useState } from 'react'
import { setWaterGlasses } from '../model/waterApi'

function GlassIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 22" width="16" height="22" aria-hidden="true" fill="none">
      <path
        d="M2 2 L14 2 L11.5 20 L4.5 20 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

interface Props {
  waterGlasses: number
  waterGoalGlasses: number
  date: string
  onUpdate: () => void
}

export function WaterIntakeCard({ waterGlasses, waterGoalGlasses, date, onUpdate }: Props) {
  const [glasses, setGlasses] = useState(waterGlasses)
  const [saving, setSaving] = useState(false)
  const goal = Math.max(waterGoalGlasses, 1)

  useEffect(() => {
    setGlasses(waterGlasses)
  }, [waterGlasses, date])

  async function handleTap(index: number) {
    if (saving) return
    // tap last filled → remove it; tap anything else → set to that level
    const next = index + 1 === glasses ? index : index + 1
    setGlasses(next)
    setSaving(true)
    try {
      await setWaterGlasses(next, date)
      onUpdate()
    } catch {
      setGlasses(glasses)
    } finally {
      setSaving(false)
    }
  }

  const pct = Math.min(100, Math.round((glasses / goal) * 100))

  return (
    <section className="panel water-card-v2" aria-label="Water intake tracker">
      <div className="water-card-v2__header">
        <span className="water-card-v2__title">💧 Water</span>
        <span className="water-card-v2__count">
          <strong>{glasses}</strong>
          <span> / {goal} glasses</span>
          {pct >= 100 && <span className="water-card-v2__done"> · Done!</span>}
        </span>
      </div>
      <div className="water-card-v2__circles">
        {Array.from({ length: goal }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={`water-glass-btn${i < glasses ? ' water-glass-btn--filled' : ''}`}
            onClick={() => handleTap(i)}
            aria-label={`Glass ${i + 1}`}
          >
            <GlassIcon filled={i < glasses} />
          </button>
        ))}
      </div>
    </section>
  )
}
