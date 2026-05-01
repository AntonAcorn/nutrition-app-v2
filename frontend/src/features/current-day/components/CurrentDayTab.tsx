import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { WaterIntakeCard } from './WaterIntakeCard'
import { QuickAddSheet } from './QuickAddSheet'
import { SavedMealsCard } from './SavedMealsCard'
import { MealsLogCard } from './MealsLogCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import { addMealManually, resetToday } from '../model/nutritionTotalsApi'
import { logTemplate } from '../../food-library/model/mealTemplateApi'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
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
  const [showQuickAdd, setShowQuickAdd] = useState(false)

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

  async function handleTemplateLog(templateId: string) {
    await logTemplate(templateId, getTodayLocalDateInputValue())
    const nextSummary = await fetchTodaySummary()
    setSummary(nextSummary)
    setShowQuickAdd(false)
    onDayUpdated?.()
  }

  async function handleMealAdd(kcal: number, protein: number, fat: number, fiber: number, carbs: number) {
    setSavingNutrition(true)
    try {
      await addMealManually({ caloriesConsumedKcal: kcal, proteinGrams: protein, fatGrams: fat, fiberGrams: fiber, carbsGrams: carbs })
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      setShowQuickAdd(false)
      onDayUpdated?.()
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

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 200) {
      setError('Enter a valid weight between 1 and 200 kg')
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
      {!loading && !error && summary ? <MealsLogCard refreshToken={refreshToken} onDeleted={() => { fetchTodaySummary().then(setSummary).catch(() => {}) }} /> : null}
      {!loading && !error && summary ? <WaterIntakeCard waterGlasses={summary.waterGlasses} waterGoalGlasses={summary.waterGoalGlasses} onUpdate={() => { fetchTodaySummary().then(setSummary).catch(() => {}) }} /> : null}
      {!loading && !error && summary ? <SavedMealsCard onLogged={() => { onDayUpdated?.() }} /> : null}

      {!loading && summary ? (
        <section className="panel quick-add-trigger-card">
          <div className="quick-add-trigger-card__left">
            <p className="quick-add-trigger-card__title">Quick add</p>
            <p className="quick-add-trigger-card__subtitle">No photo? Log it manually.</p>
          </div>
          <button type="button" className="quick-add-trigger-card__btn" onClick={() => setShowQuickAdd(true)}>
            +
          </button>
        </section>
      ) : null}

      {showQuickAdd && (
        <QuickAddSheet
          onAdd={handleMealAdd}
          onLogTemplate={handleTemplateLog}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

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
