import { useState } from 'react'
import { setWaterGlasses } from '../model/waterApi'

interface Props {
  waterGlasses: number
  waterGoalGlasses: number
  onUpdate: () => void
}

export function WaterIntakeCard({ waterGlasses, waterGoalGlasses, onUpdate }: Props) {
  const [glasses, setGlasses] = useState(waterGlasses)
  const [saving, setSaving] = useState(false)
  const goal = Math.max(waterGoalGlasses, 1)

  async function handleTap(index: number) {
    if (saving) return
    // tap last filled → remove it; tap anything else → set to that level
    const next = index + 1 === glasses ? index : index + 1
    setGlasses(next)
    setSaving(true)
    try {
      await setWaterGlasses(next)
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
            className={`water-circle${i < glasses ? ' water-circle--filled' : ''}`}
            onClick={() => handleTap(i)}
            aria-label={`Glass ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
