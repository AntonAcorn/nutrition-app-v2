import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { WaterIntakeCard } from './WaterIntakeCard'
import { QuickAddSheet } from './QuickAddSheet'
import { MealsLogCard } from './MealsLogCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import { addMealManually, resetToday } from '../model/nutritionTotalsApi'
import { logTemplate } from '../../food-library/model/mealTemplateApi'
import { getTodayLocalDateInputValue, offsetDate, formatNavDateLabel } from '../../../shared/lib/date'
import type { TodaySummary } from '../../../shared/types/nutrition'
import { MascotSvg } from './MascotSvg'
import { getMascotMood } from '../model/getMascotMood'
import { getTodaySteps, getTodayActiveCalories, getLatestWeightFromHealth, isHealthKitSupported } from '../../../shared/lib/healthKit'

const MAX_PAST_DAYS = 90

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
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalDateInputValue())
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

  const today = getTodayLocalDateInputValue()
  const isToday = selectedDate === today
  const minDate = offsetDate(today, -MAX_PAST_DAYS)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setLoading(true)
      setError('')

      try {
        const nextSummary = await fetchTodaySummary(selectedDate)
        if (!cancelled) {
          setSummary(nextSummary)
          if (isToday && isHealthKitSupported()) {
            const healthSample = await getLatestWeightFromHealth()
            if (!cancelled) {
              const dbTime = nextSummary.weightUpdatedAt ? new Date(nextSummary.weightUpdatedAt) : null
              const healthIsNewer = healthSample != null && (dbTime == null || healthSample.measuredAt > dbTime)
              if (healthIsNewer) {
                setWeightInput(String(healthSample!.weightKg))
                setWeightFromHealth(true)
              } else if (nextSummary.weightKg != null) {
                setWeightInput(String(nextSummary.weightKg))
                setWeightFromHealth(false)
              } else {
                setWeightInput('')
                setWeightFromHealth(false)
              }
            }
          } else if (nextSummary.weightKg != null) {
            setWeightInput(String(nextSummary.weightKg))
            setWeightFromHealth(false)
          } else {
            setWeightInput('')
            setWeightFromHealth(false)
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

    if (isToday && isHealthKitSupported()) {
      getTodaySteps().then(setSteps)
      getTodayActiveCalories().then(setActiveCalories)
    } else {
      setSteps(0)
      setActiveCalories(0)
    }

    return () => {
      cancelled = true
    }
  }, [refreshToken, selectedDate, isToday])

  async function handleTemplateLog(templateId: string, slotType?: string) {
    await logTemplate(templateId, selectedDate, slotType)
    const nextSummary = await fetchTodaySummary(selectedDate)
    setSummary(nextSummary)
    onDayUpdated?.()
  }

  async function handleMealAdd(kcal: number, protein: number, fat: number, fiber: number, carbs: number, name?: string, slotType?: string) {
    setSavingNutrition(true)
    try {
      await addMealManually({ caloriesConsumedKcal: kcal, proteinGrams: protein, fatGrams: fat, fiberGrams: fiber, carbsGrams: carbs, mealName: name, slotType }, selectedDate)
      const nextSummary = await fetchTodaySummary(selectedDate)
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
    if (!window.confirm('Reset this day\'s nutrition totals to zero?')) return
    setResettingDay(true)
    setError('')
    try {
      await resetToday(selectedDate)
      const nextSummary = await fetchTodaySummary(selectedDate)
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
      await updateTodayWeight(parsedWeight, selectedDate)
      const nextSummary = await fetchTodaySummary(selectedDate)
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

  function goToPrevDay() {
    const prev = offsetDate(selectedDate, -1)
    if (prev >= minDate) setSelectedDate(prev)
  }

  function goToNextDay() {
    if (!isToday) setSelectedDate(offsetDate(selectedDate, 1))
  }

  const canGoPrev = selectedDate > minDate
  const dateLabel = formatNavDateLabel(selectedDate)

  return (
    <section className="screen-section screen-section--home-dark">
      <div className="day-nav">
        <button
          type="button"
          className="day-nav__btn"
          onClick={goToPrevDay}
          disabled={!canGoPrev}
          aria-label="Previous day"
        >
          ←
        </button>
        <span className={`day-nav__label${!isToday ? ' day-nav__label--past' : ''}`}>
          {dateLabel}
        </span>
        <button
          type="button"
          className="day-nav__btn"
          onClick={goToNextDay}
          disabled={isToday}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      {isToday && (
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
      )}

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
          date={selectedDate}
          refreshToken={refreshToken}
          onAddToSlot={openQuickAdd}
          onDeleted={() => { fetchTodaySummary(selectedDate).then(setSummary).catch(() => {}) }}
          onUpdated={() => { fetchTodaySummary(selectedDate).then(setSummary).catch(() => {}); onDayUpdated?.() }}
        />
      ) : null}

      {!loading && !error && summary ? (
        <WaterIntakeCard
          waterGlasses={summary.waterGlasses}
          waterGoalGlasses={summary.waterGoalGlasses}
          date={selectedDate}
          onUpdate={() => { fetchTodaySummary(selectedDate).then(setSummary).catch(() => {}) }}
        />
      ) : null}

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
