import { useState } from 'react'
import { setWaterGlasses } from '../model/waterApi'
import { MascotSvg } from './MascotSvg'
import type { MascotMood } from './MascotSvg'

const mascotMoodByLevel: MascotMood[] = ['thirsty', 'neutral', 'happy', 'cheer', 'excited']
const moodByLevel = ['Dry start', 'Nice', 'Better', 'Great', 'Hydrated!']

function mascotIndex(glasses: number): number {
  if (glasses === 0) return 0
  if (glasses <= 2) return 1
  if (glasses <= 4) return 2
  if (glasses <= 6) return 3
  return 4
}

interface Props {
  waterGlasses: number
  waterGoalGlasses: number
  onUpdate: () => void
}

export function WaterIntakeCard({ waterGlasses, waterGoalGlasses, onUpdate }: Props) {
  const [glasses, setGlasses] = useState(waterGlasses)
  const [saving, setSaving] = useState(false)

  const displayMax = Math.max(waterGoalGlasses, 1)
  const progress = Math.min((glasses / displayMax) * 100, 100)
  const idx = mascotIndex(glasses)

  async function applyGlasses(next: number) {
    const clamped = Math.max(0, next)
    setGlasses(clamped)
    setSaving(true)
    try {
      await setWaterGlasses(clamped)
      onUpdate()
    } catch {
      // optimistic
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="water-card panel" aria-label="Water intake tracker">
      <div className="water-card__header">
        <MascotSvg mood={mascotMoodByLevel[idx]} size={80} className="water-card__mascot" aria-live="polite" />
        <div className="water-card__header-info">
          <p className="screen-header__meta">Water</p>
          <h3>{glasses} {glasses === 1 ? 'glass' : 'glasses'}</h3>
          <small className="water-card__mood">{moodByLevel[idx]}</small>
        </div>
      </div>

      <div className="water-card__slider" aria-hidden="true">
        <span className="water-card__slider-fill" style={{ width: `${progress}%` }} />
        <div className="water-card__ticks">
          {Array.from({ length: displayMax + 1 }).map((_, index) => (
            <span
              key={index}
              className={`water-card__tick ${index <= Math.min(glasses, displayMax) ? 'water-card__tick--active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="water-card__actions">
        <button type="button" className="water-card__button water-card__button--secondary" onClick={() => applyGlasses(0)} disabled={glasses === 0 || saving}>
          Reset
        </button>
        <button type="button" className="water-card__button" onClick={() => applyGlasses(glasses + 1)} disabled={saving}>
          +1 glass
        </button>
      </div>
    </section>
  )
}
