import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { WaterIntakeCard } from './WaterIntakeCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import { addMealManually, resetToday } from '../model/nutritionTotalsApi'
import type { TodaySummary } from '../../../shared/types/nutrition'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 12) return 'Good morning,\nfuture athlete 👀'
  if (hour >= 12 && hour < 17) return 'Good afternoon.\nStill going? Impressive.'
  if (hour >= 17 && hour < 22) return 'Survived another day.\nRespect.'
  return 'Still awake?\nBold choice.'
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
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [resettingDay, setResettingDay] = useState(false)
  const [caloriesInput, setCaloriesInput] = useState('0')
  const [proteinInput, setProteinInput] = useState('0')
  const [fatInput, setFatInput] = useState('0')
  const [fiberInput, setFiberInput] = useState('0')

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

  async function handleMealAdd() {
    const kcal = Number(caloriesInput)
    const protein = Number(proteinInput)
    const fat = Number(fatInput)
    const fiber = Number(fiberInput)

    if ([kcal, protein, fat, fiber].some((v) => !Number.isFinite(v) || v < 0)) {
      setError('Enter valid non-negative numbers for all fields')
      return
    }

    setSavingNutrition(true)
    setError('')

    try {
      await addMealManually({ caloriesConsumedKcal: kcal, proteinGrams: protein, fatGrams: fat, fiberGrams: fiber })
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      setCaloriesInput('0')
      setProteinInput('0')
      setFatInput('0')
      setFiberInput('0')
      setShowNutritionEdit(false)
      onDayUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meal')
    } finally {
      setSavingNutrition(false)
    }
  }

  async function handleResetDay() {
    if (!window.confirm('Reset today\'s nutrition totals to zero?')) return
    setResettingDay(true)
    setError('')
    try {
      await resetToday()
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      onDayUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset day')
    } finally {
      setResettingDay(false)
    }
  }

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
        <section className="panel quick-add-card">
          <div className="quick-add-card__header">
            <p className="quick-add-card__title">Quick add</p>
            <p className="quick-add-card__subtitle">No photo? Log it manually.</p>
          </div>
          <div className="quick-add-grid">
            <label className="quick-add-field">
              <span>Calories</span>
              <div className="quick-add-field__wrap">
                <input type="text" inputMode="decimal" value={caloriesInput} onChange={(e) => setCaloriesInput(e.target.value)} />
                <span className="quick-add-field__unit">kcal</span>
              </div>
            </label>
            <label className="quick-add-field">
              <span>Protein</span>
              <div className="quick-add-field__wrap">
                <input type="text" inputMode="decimal" value={proteinInput} onChange={(e) => setProteinInput(e.target.value)} />
                <span className="quick-add-field__unit">g</span>
              </div>
            </label>
            <label className="quick-add-field">
              <span>Fat</span>
              <div className="quick-add-field__wrap">
                <input type="text" inputMode="decimal" value={fatInput} onChange={(e) => setFatInput(e.target.value)} />
                <span className="quick-add-field__unit">g</span>
              </div>
            </label>
            <label className="quick-add-field">
              <span>Fiber</span>
              <div className="quick-add-field__wrap">
                <input type="text" inputMode="decimal" value={fiberInput} onChange={(e) => setFiberInput(e.target.value)} />
                <span className="quick-add-field__unit">g</span>
              </div>
            </label>
          </div>
          <button type="button" className="quick-add-card__submit" onClick={handleMealAdd} disabled={savingNutrition}>
            {savingNutrition ? 'Adding...' : '+ Add to today'}
          </button>
          <button type="button" className="quick-add-card__reset" onClick={handleResetDay} disabled={resettingDay}>
            {resettingDay ? 'Resetting...' : 'Reset today\'s data'}
          </button>
        </section>
      ) : null}

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
