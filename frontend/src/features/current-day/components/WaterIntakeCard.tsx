import { useMemo, useState } from 'react'

const MAX_GLASSES = 4
const glassLabels = ['0 / 4', '1 / 4', '2 / 4', '3 / 4', '4 / 4']
const moodText = ['Dry start', 'Nice', 'Better', 'Great', 'Hydrated!']
const mascotByGlasses = ['/mascot/sad.png', '/mascot/happy.png', '/mascot/happy.png', '/mascot/water.png', '/mascot/joy.png']

export function WaterIntakeCard() {
  const [glasses, setGlasses] = useState(0)

  const progress = useMemo(() => (glasses / MAX_GLASSES) * 100, [glasses])

  function handleAddGlass() {
    setGlasses((current) => Math.min(MAX_GLASSES, current + 1))
  }

  function handleReset() {
    setGlasses(0)
  }

  return (
    <section className="water-card panel" aria-label="Water intake tracker">
      <div className="water-card__header">
        <img src={mascotByGlasses[glasses]} alt="Puzometr" className="water-card__mascot" aria-live="polite" />
        <div className="water-card__header-info">
          <p className="screen-header__meta">Water</p>
          <h3>{glassLabels[glasses]}</h3>
          <small className="water-card__mood">{moodText[glasses]}</small>
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

      <div className="water-card__actions">
        <button type="button" className="water-card__button water-card__button--secondary" onClick={handleReset} disabled={glasses === 0}>
          Reset
        </button>
        <button type="button" className="water-card__button" onClick={handleAddGlass} disabled={glasses >= MAX_GLASSES}>
          {glasses >= MAX_GLASSES ? 'Done for now' : '+1 glass'}
        </button>
      </div>
    </section>
  )
}
