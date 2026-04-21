import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { WaterIntakeCard } from './WaterIntakeCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import type { TodaySummary } from '../../../shared/types/nutrition'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 12) return 'Good morning, future athlete 👀'
  if (hour >= 12 && hour < 17) return 'Good afternoon. Still going? Impressive.'
  if (hour >= 17 && hour < 22) return 'Survived another day. Respect.'
  return 'Still awake? Bold choice.'
}

interface CurrentDayTabProps {
  refreshToken?: number
  successMessage?: string
  onDayUpdated?: () => void
  displayName?: string | null
}

export function CurrentDayTab({ refreshToken = 0, successMessage = '', onDayUpdated, displayName }: CurrentDayTabProps) {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setLoading(true)
      setError('')

      try {
        const nextSummary = await fetchTodaySummary()
        if (!cancelled) {
          setSummary(nextSummary)
          setWeightInput(nextSummary.weightKg != null ? String(nextSummary.weightKg) : '')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load daily summary')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSummary()
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  async function handleWeightSave() {
    const normalizedWeightInput = weightInput.trim().replace(',', '.')
    const parsedWeight = Number(normalizedWeightInput)

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError('Enter a valid weight in kilograms')
      return
    }

    setSavingWeight(true)
    setError('')

    try {
      await updateTodayWeight(parsedWeight)
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      setWeightInput(nextSummary.weightKg != null ? String(nextSummary.weightKg) : '')
      onDayUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save weight')
    } finally {
      setSavingWeight(false)
    }
  }

  return (
    <section className="screen-section screen-section--home-dark">
      <div className="mascot-hero-card">
        <img src="/mascot/hero.png" alt="Puzometr" className="mascot-hero-card__image" />
        <div className="mascot-hero-card__text">
          <p className="mascot-hero-card__greeting">{getGreeting()}</p>
          {displayName ? <p className="mascot-hero-card__name">{displayName}</p> : null}
        </div>
      </div>

      {successMessage ? <section className="panel detail-panel"><p className="success-text">{successMessage}</p></section> : null}
      {loading ? <section className="panel detail-panel"><p>Loading daily summary...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? <TodaySummaryBlock summary={summary} /> : null}
      {!loading && !error && summary ? <WaterIntakeCard /> : null}

      {!loading && summary ? (
        <section className="weight-mascot-card panel">
          <img src="/mascot/cheer.png" alt="" className="weight-mascot-card__img" />
          <div className="weight-mascot-card__body">
            <div>
              <p className="screen-header__meta">Weight</p>
              <h3>{summary.weightKg == null ? 'Add today weight' : `${summary.weightKg.toFixed(1)} kg`}</h3>
            </div>
            <div className="weight-panel__form">
              <label>
                Weight, kg
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                  placeholder="82.4"
                />
              </label>
              <button type="button" onClick={handleWeightSave} disabled={savingWeight}>
                {savingWeight ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  )
}
