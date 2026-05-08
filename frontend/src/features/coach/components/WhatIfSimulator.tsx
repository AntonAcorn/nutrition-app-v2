import { useMemo, useState } from 'react'

const KCAL_PER_KG_FAT = 7700

const DAYS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7,  label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
]

/**
 * Pure-frontend "what would change?" calculator. Lets the user move a
 * daily kcal slider and see the projected weight delta over a chosen
 * window. Uses the standard 7700 kcal/kg fat rule — close enough for
 * directional intuition; the goal here is motivation, not clinical
 * precision.
 */
export function WhatIfSimulator() {
  const [delta, setDelta] = useState(-200)
  const [days, setDays] = useState(14)

  const result = useMemo(() => {
    const totalKcal = delta * days
    const weightKg = totalKcal / KCAL_PER_KG_FAT
    return {
      weightKg,
      totalKcal,
    }
  }, [delta, days])

  const direction = result.weightKg < 0 ? 'down' : result.weightKg > 0 ? 'up' : 'flat'
  const arrow = direction === 'down' ? '↓' : direction === 'up' ? '↑' : '→'
  const tone = direction === 'down' ? 'good' : direction === 'up' ? 'over' : 'muted'

  return (
    <section className="panel what-if-card" aria-label="What-if simulator">
      <header className="what-if-card__header">
        <span className="what-if-card__brand">🔮 WHAT IF</span>
      </header>

      <div className="what-if-card__row">
        <label className="what-if-card__field">
          <span className="what-if-card__label">Daily change</span>
          <input
            type="range"
            min={-500}
            max={500}
            step={50}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="what-if-card__slider"
          />
          <span className={`what-if-card__delta what-if-card__delta--${delta < 0 ? 'cut' : delta > 0 ? 'add' : 'flat'}`}>
            {delta > 0 ? `+${delta}` : delta} kcal/day
          </span>
        </label>
      </div>

      <div className="what-if-card__chips">
        {DAYS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`what-if-card__chip${days === opt.value ? ' what-if-card__chip--active' : ''}`}
            onClick={() => setDays(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={`what-if-card__result what-if-card__result--${tone}`}>
        <div className="what-if-card__result-main">
          <span className="what-if-card__arrow" aria-hidden>{arrow}</span>
          <span className="what-if-card__weight">
            {Math.abs(result.weightKg).toFixed(2)} kg
          </span>
        </div>
        <p className="what-if-card__result-sub">
          {direction === 'down' && `over ${days} days from a ${Math.abs(delta)} kcal daily deficit`}
          {direction === 'up' && `over ${days} days from a ${delta} kcal daily surplus`}
          {direction === 'flat' && 'no change at this rate'}
        </p>
        <p className="what-if-card__result-fine">
          Based on 7700 kcal ≈ 1 kg of fat. Real bodies hold water, glycogen and stress — actual numbers wobble around this.
        </p>
      </div>
    </section>
  )
}
