import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { WaterIntakeCard } from './WaterIntakeCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import { updateTodayNutritionTotals } from '../model/nutritionTotalsApi'
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
  const [showNutritionEdit, setShowNutritionEdit] = useState(false)
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [caloriesInput, setCaloriesInput] = useState('')
  const [proteinInput, setProteinInput] = useState('')
  const [fatInput, setFatInput] = useState('')
  const [fiberInput, setFiberInput] = useState('')

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
          setCaloriesInput(String(Math.round(Number(nextSummary.consumedCalories))))
          setProteinInput(String(Math.round(Number(nextSummary.proteinGrams))))
          setFatInput(String(Math.round(Number(nextSummary.fatGrams))))
          setFiberInput(String(Math.round(Number(nextSummary.fiberGrams))))
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

  async function handleNutritionSave() {
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
      await updateTodayNutritionTotals({ caloriesConsumedKcal: kcal, proteinGrams: protein, fatGrams: fat, fiberGrams: fiber })
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      setCaloriesInput(String(Math.round(Number(nextSummary.consumedCalories))))
      setProteinInput(String(Math.round(Number(nextSummary.proteinGrams))))
      setFatInput(String(Math.round(Number(nextSummary.fatGrams))))
      setFiberInput(String(Math.round(Number(nextSummary.fiberGrams))))
      setShowNutritionEdit(false)
      onDayUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save nutrition totals')
    } finally {
      setSavingNutrition(false)
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
        <section className="panel detail-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="screen-header__meta">Adjust today's totals</p>
            <button type="button" onClick={() => setShowNutritionEdit((v) => !v)}>
              {showNutritionEdit ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {showNutritionEdit ? (
            <div className="weight-panel__form">
              <label>
                Calories, kcal
                <input type="text" inputMode="decimal" value={caloriesInput} onChange={(e) => setCaloriesInput(e.target.value)} />
              </label>
              <label>
                Protein, g
                <input type="text" inputMode="decimal" value={proteinInput} onChange={(e) => setProteinInput(e.target.value)} />
              </label>
              <label>
                Fat, g
                <input type="text" inputMode="decimal" value={fatInput} onChange={(e) => setFatInput(e.target.value)} />
              </label>
              <label>
                Fiber, g
                <input type="text" inputMode="decimal" value={fiberInput} onChange={(e) => setFiberInput(e.target.value)} />
              </label>
              <button type="button" onClick={handleNutritionSave} disabled={savingNutrition}>
                {savingNutrition ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : null}
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
