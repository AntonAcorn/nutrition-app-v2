import { useState } from 'react'
import { setWaterGlasses } from '../model/waterApi'

const DISPLAY_MAX = 8
const mascotByLevel = ['/mascot/sad.png', '/mascot/happy.png', '/mascot/cheer.png', '/mascot/water.png', '/mascot/joy.png']
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
  onUpdate: () => void
}

export function WaterIntakeCard({ waterGlasses, onUpdate }: Props) {
  const [glasses, setGlasses] = useState(waterGlasses)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const progress = Math.min((glasses / DISPLAY_MAX) * 100, 100)
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

  function handleAddGlass() {
    applyGlasses(glasses + 1)
  }

  function handleReset() {
    setInput('')
    applyGlasses(0)
  }

  function handleInputCommit() {
    const parsed = parseInt(input, 10)
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 99) {
      applyGlasses(parsed)
      setInput('')
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleInputCommit()
  }

  return (
    <section className="water-card panel" aria-label="Water intake tracker">
      <div className="water-card__header">
        <img src={mascotByLevel[idx]} alt="Puzometr" className="water-card__mascot" aria-live="polite" />
        <div className="water-card__header-info">
          <p className="screen-header__meta">Water</p>
          <h3>{glasses} {glasses === 1 ? 'glass' : 'glasses'}</h3>
          <small className="water-card__mood">{moodByLevel[idx]}</small>
        </div>
      </div>

      <div className="water-card__slider" aria-hidden="true">
        <span className="water-card__slider-fill" style={{ width: `${progress}%` }} />
        <div className="water-card__ticks">
          {Array.from({ length: DISPLAY_MAX + 1 }).map((_, index) => (
            <span
              key={index}
              className={`water-card__tick ${index <= Math.min(glasses, DISPLAY_MAX) ? 'water-card__tick--active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="water-card__actions">
        <button type="button" className="water-card__button water-card__button--secondary" onClick={handleReset} disabled={glasses === 0 || saving}>
          Reset
        </button>
        <button type="button" className="water-card__button" onClick={handleAddGlass} disabled={saving}>
          +1 glass
        </button>
      </div>

      <div className="water-card__manual">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={handleInputCommit}
          onKeyDown={handleInputKeyDown}
          placeholder="Set exact amount"
          className="water-card__manual-input"
        />
      </div>
    </section>
  )
}
