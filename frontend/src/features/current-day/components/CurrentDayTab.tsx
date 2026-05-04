import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { WaterIntakeCard } from './WaterIntakeCard'
import { QuickAddSheet } from './QuickAddSheet'
import { MealsLogCard } from './MealsLogCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import { addMealManually, resetToday } from '../model/nutritionTotalsApi'
import { logTemplate } from '../../food-library/model/mealTemplateApi'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import type { TodaySummary } from '../../../shared/types/nutrition'
import { MascotSvg } from './MascotSvg'
import { getMascotMood } from '../model/getMascotMood'
import { getTodaySteps, getTodayActiveCalories, getLatestWeightFromHealth, isHealthKitSupported } from '../../../shared/lib/healthKit'

function getGreeting(summary?: TodaySummary | null): string {
  const hour = new Date().getHours()

  if (summary) {
    const { weightTrend7d, targetWeightKg, remainingCalories, dailyTargetCalories, loggingStreakDays } = summary
    if (weightTrend7d != null && targetWeightKg != null) {
      if (weightTrend7d < -0.1) return `↓ ${Math.abs(weightTrend7d).toFixed(1)} kg this week.\nYou're on track.`
      if (weightTrend7d > 0.1)  return `Weight is up ${weightTrend7d.toFixed(1)} kg.\nWatch the surplus.`
    }
    if (loggingStreakDays >= 7) return `${loggingStreakDays} days straight.\nConsistency wins.`
    const ratio = remainingCalories / Math.max(1, dailyTargetCalories)
    if (hour >= 19 && ratio > 0.4) return `${Math.round(remainingCalories)} kcal left.\nTime to eat.`
  }

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
  onOpenAnalyzer?: (mode: 'photo' | 'voice' | 'barcode') => void
}

export function CurrentDayTab({ refreshToken = 0, successMessage = '', onDayUpdated, displayName, onOpenAnalyzer }: CurrentDayTabProps) {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [steps, setSteps] = useState(0)
  const [activeCalories, setActiveCalories] = useState(0)
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [weightFromHealth, setWeightFromHealth] = useState(false)
  const [error, setError] = useState('')
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [resettingDay, setResettingDay] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSlot, setQuickAddSlot] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setLoading(true)
      setError('')

      try {
        const nextSummary = await fetchTodaySummary()
        if (!cancelled) {
          setSummary(nextSummary)
          if (isHealthKitSupported()) {
            const healthSample = await getLatestWeightFromHealth()
            if (!cancelled) {
              const dbTime = nextSummary.weightUpdatedAt ? new Date(nextSummary.weightUpdatedAt) : null
              const healthIsNewer = healthSample != null && (dbTime == null || healthSample.measuredAt > dbTime)
              if (healthIsNewer) {
                setWeightInput(String(healthSample!.weightKg))
                setWeightFromHealth(true)
              } else if (nextSummary.weightKg != null) {
                setWeightInput(String(nextSummary.weightKg))
              }
            }
          } else if (nextSummary.weightKg != null) {
            setWeightInput(String(nextSummary.weightKg))
          }
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

    if (isHealthKitSupported()) {
      getTodaySteps().then(setSteps)
      getTodayActiveCalories().then(setActiveCalories)
    }

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  async function handleTemplateLog(templateId: string, slotType?: string) {
    await logTemplate(templateId, getTodayLocalDateInputValue(), slotType)
    const nextSummary = await fetchTodaySummary()
    setSummary(nextSummary)
    onDayUpdated?.()
  }

  async function handleMealAdd(kcal: number, protein: number, fat: number, fiber: number, carbs: number, name?: string, slotType?: string) {
    setSavingNutrition(true)
    try {
      await addMealManually({ caloriesConsumedKcal: kcal, proteinGrams: protein, fatGrams: fat, fiberGrams: fiber, carbsGrams: carbs, mealName: name, slotType })
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      setShowQuickAdd(false)
      onDayUpdated?.()
    } finally {
      setSavingNutrition(false)
    }
  }

  function openQuickAdd(slotType?: string) {
    setQuickAddSlot(slotType)
    setShowQuickAdd(true)
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
      setWeightFromHealth(false)
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
        <MascotSvg mood={getMascotMood(summary)} size={100} className="mascot-hero-card__image" />
        <div className="mascot-hero-card__text">
          <p className="mascot-hero-card__greeting">{getGreeting(summary)}</p>
          {displayName ? <p className="mascot-hero-card__name">{displayName}</p> : null}
          {summary && summary.loggingStreakDays >= 2 && (
            <span className="streak-badge">🔥 {summary.loggingStreakDays} days</span>
          )}
        </div>
      </div>

      {successMessage ? <section className="panel detail-panel"><p className="success-text">{successMessage}</p></section> : null}
      {loading ? <section className="panel detail-panel"><p>Loading daily summary...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? (
        <TodaySummaryBlock
          summary={summary}
          steps={steps}
          activeCalories={activeCalories}
          weightInput={weightInput}
          weightFromHealth={weightFromHealth}
          savingWeight={savingWeight}
          onWeightChange={(v) => { setWeightInput(v); setWeightFromHealth(false) }}
          onWeightSave={handleWeightSave}
        />
      ) : null}

      {!loading && !error && summary ? (
        <MealsLogCard
          refreshToken={refreshToken}
          onAddToSlot={openQuickAdd}
          onDeleted={() => { fetchTodaySummary().then(setSummary).catch(() => {}) }}
          onUpdated={() => { fetchTodaySummary().then(setSummary).catch(() => {}); onDayUpdated?.() }}
        />
      ) : null}

      {!loading && !error && summary ? <WaterIntakeCard waterGlasses={summary.waterGlasses} waterGoalGlasses={summary.waterGoalGlasses} onUpdate={() => { fetchTodaySummary().then(setSummary).catch(() => {}) }} /> : null}

      {!loading && summary ? (
        <button type="button" className="quick-add-fab" onClick={() => openQuickAdd()} aria-label="Quick add food">
          +
        </button>
      ) : null}

      {showQuickAdd && (
        <QuickAddSheet
          initialSlot={quickAddSlot}
          onAdd={handleMealAdd}
          onLogTemplate={handleTemplateLog}
          onClose={() => setShowQuickAdd(false)}
          onOpenAnalyzer={onOpenAnalyzer}
        />
      )}

    </section>
  )
}
