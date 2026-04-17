import { useMemo, useState } from 'react'

const MAX_GLASSES = 4
const glassLabels = ['0 / 4', '1 / 4', '2 / 4', '3 / 4', '4 / 4']
const moodEmoji = ['😔', '🙂', '😊', '😁', '🤩']
const moodText = ['Dry start', 'Nice', 'Better', 'Great', 'Hydrated']

export function WaterIntakeCard() {
  const [glasses, setGlasses] = useState(0)

  const progress = useMemo(() => (glasses / MAX_GLASSES) * 100, [glasses])

  function handleAddGlass() {
    setGlasses((current) => Math.min(MAX_GLASSES, current + 1))
  }

  return (
    <section className="water-card panel" aria-label="Water intake tracker">
      <div className="water-card__header">
        <div>
          <p className="screen-header__meta">Water</p>
          <h3>{glassLabels[glasses]}</h3>
        </div>
        <div className="water-card__emoji" aria-live="polite">
          <span>{moodEmoji[glasses]}</span>
          <small>{moodText[glasses]}</small>
        </div>
      </div>

      <div className="water-card__slider" aria-hidden="true">
        <span className="water-card__slider-fill" style={{ width: `${progress}%` }} />
        <div className="water-card__ticks">
          {Array.from({ length: MAX_GLASSES + 1 }).map((_, index) => (
            <span
              key={index}
              className={`water-card__tick ${index <= glasses ? 'water-card__tick--active' : ''}`}
            />
          ))}
        </div>
      </div>

      <button type="button" className="water-card__button" onClick={handleAddGlass} disabled={glasses >= MAX_GLASSES}>
        {glasses >= MAX_GLASSES ? 'Done for now' : '+1 glass'}
      </button>
    </section>
  )
}
