import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { CoachInsightsCard } from '../../coach/components/CoachInsightsCard'
import { WeeklyRecapCard } from '../../coach/components/WeeklyRecapCard'
import { CoachTour, shouldShowCoachTourOnce, markCoachTourSeen } from '../../coach/components/CoachTour'
import { WellbeingDailyPrompt } from '../../wellbeing/components/WellbeingDailyPrompt'
import { WeeklyBankCard } from './WeeklyBankCard'
import { WaterIntakeCard } from './WaterIntakeCard'
import { QuickAddSheet } from './QuickAddSheet'
import { MealSlotPickerPopup } from './MealSlotPickerPopup'
import { defaultSlotByTime, type MealSlot } from '../model/mealLogApi'
import { MealsLogCard } from './MealsLogCard'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import { addMealManually, resetToday } from '../model/nutritionTotalsApi'
import { listMealLog } from '../model/mealLogApi'
import { logTemplate, listTemplates } from '../../food-library/model/mealTemplateApi'
import { fetchNutritionStatistics } from '../../statistics/model/statisticsApi'
import { getTodayLocalDateInputValue, offsetDate, formatNavDateLabel } from '../../../shared/lib/date'
import type { TodaySummary } from '../../../shared/types/nutrition'
import { MascotSvg } from './MascotSvg'
import { getMascotMood } from '../model/getMascotMood'
import { getTodaySteps, getTodayActiveCalories, getLatestWeightFromHealth, isHealthKitSupported, requestHealthPermissions } from '../../../shared/lib/healthKit'
import { hapticLight, hapticMedium } from '../../../shared/lib/haptic'

const PTR_THRESHOLD = 56

const MAX_PAST_DAYS = 90

function getGreeting(summary?: TodaySummary | null, name?: string | null): string {
  const hour = new Date().getHours()
  const first = (name && name.trim()) ? name.trim().split(/\s+/)[0] : null
  const opener = first ? `${first}, ` : ''
  const cap = (s: string) => first ? s : s.charAt(0).toUpperCase() + s.slice(1)

  if (summary) {
    const { weightTrend7d, targetWeightKg, remainingCalories, dailyTargetCalories, loggingStreakDays } = summary
    if (weightTrend7d != null && targetWeightKg != null) {
      if (weightTrend7d < -0.1) return opener + cap(`down ${Math.abs(weightTrend7d).toFixed(1)} kg vs last week — keep it up.`)
      if (weightTrend7d > 0.1)  return opener + cap(`up ${weightTrend7d.toFixed(1)} kg vs last week — stay under target today.`)
    }
    if (loggingStreakDays >= 7) return opener + cap(`${loggingStreakDays} days logged in a row — consistency wins.`)
    const ratio = remainingCalories / Math.max(1, dailyTargetCalories)
    if (hour >= 19 && ratio > 0.4) return opener + cap(`${Math.round(remainingCalories)} kcal left for today — still room to eat.`)
  }

  if (hour >= 5  && hour < 12) return first ? `Good morning, ${first}.` : 'Good morning, future athlete 👀'
  if (hour >= 12 && hour < 17) return first ? `Good afternoon, ${first}.` : 'Good afternoon. Still going? Impressive.'
  if (hour >= 17 && hour < 22) return first ? `Evening, ${first}.` : 'Survived another day. Respect.'
  return first ? `Still up, ${first}?` : 'Still awake? Bold choice.'
}

interface CurrentDayTabProps {
  refreshToken?: number
  successMessage?: string
  onDayUpdated?: () => void
  displayName?: string | null
  onOpenAnalyzer?: (mode: 'photo' | 'voice' | 'barcode', slotType?: string) => void
  onOpenAnalyzerWithPhoto?: (file: File, slotType?: string) => void
  onOpenLibrary?: () => void
}

export function CurrentDayTab({ refreshToken = 0, successMessage = '', onDayUpdated, displayName, onOpenAnalyzer, onOpenAnalyzerWithPhoto, onOpenLibrary }: CurrentDayTabProps) {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalDateInputValue())
  const [steps, setSteps] = useState(0)
  const [activeCalories, setActiveCalories] = useState(0)
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [weightFromHealth, setWeightFromHealth] = useState(false)
  const [actionError, setActionError] = useState('')
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [resettingDay, setResettingDay] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSlot, setQuickAddSlot] = useState<string | undefined>(undefined)
  const [slotPickerVisible, setSlotPickerVisible] = useState(false)
  const [pullDist, setPullDist] = useState(0)
  const [ptrRefreshing, setPtrRefreshing] = useState(false)
  const [showCoachTour, setShowCoachTour] = useState(false)

  const summaryQuery = useQuery<TodaySummary>({
    queryKey: ['today-summary', selectedDate],
    queryFn: () => fetchTodaySummary(selectedDate),
  })
  const summary = summaryQuery.data ?? null

  useEffect(() => {
    if (summary && summary.consumedCalories > 0 && shouldShowCoachTourOnce()) {
      setShowCoachTour(true)
    }
  }, [summary?.consumedCalories])
  const loading = summaryQuery.isLoading
  const error = actionError || (summaryQuery.error instanceof Error ? summaryQuery.error.message : '')

  function refetchSummary() {
    return queryClient.invalidateQueries({ queryKey: ['today-summary', selectedDate] })
  }

  // External refresh trigger from props
  useEffect(() => {
    if (refreshToken > 0) refetchSummary()
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop pull-to-refresh indicator when fetch finishes
  useEffect(() => {
    if (!summaryQuery.isFetching && ptrRefreshing) setPtrRefreshing(false)
  }, [summaryQuery.isFetching]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch neighboring tabs in the background after summary is ready
  useEffect(() => {
    if (!summary) return
    const prefetch = () => {
      queryClient.prefetchQuery({
        queryKey: ['meal-templates'],
        queryFn: () => listTemplates(),
        staleTime: 60_000,
      })
      queryClient.prefetchQuery({
        queryKey: ['statistics', 30],
        queryFn: () => fetchNutritionStatistics(30),
        staleTime: 60_000,
      })
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetch)
      return () => w.cancelIdleCallback?.(id)
    }
    const t = setTimeout(prefetch, 800)
    return () => clearTimeout(t)
  }, [summary, queryClient])
  const pullRef = useRef(0)
  const ptrStartY = useRef(0)
  const ptrDragging = useRef(false)

  const today = getTodayLocalDateInputValue()
  const isToday = selectedDate === today
  const minDate = offsetDate(today, -MAX_PAST_DAYS)

  // Sync weight input from summary + HealthKit
  useEffect(() => {
    if (!summary) return
    let cancelled = false
    if (isToday && isHealthKitSupported()) {
      getLatestWeightFromHealth().then(healthSample => {
        if (cancelled) return
        const dbTime = summary.weightUpdatedAt ? new Date(summary.weightUpdatedAt) : null
        const healthIsNewer = healthSample != null && (dbTime == null || healthSample.measuredAt > dbTime)
        if (healthIsNewer) {
          setWeightInput(String(healthSample!.weightKg))
          setWeightFromHealth(true)
        } else if (summary.weightKg != null) {
          setWeightInput(String(summary.weightKg))
          setWeightFromHealth(false)
        } else {
          setWeightInput('')
          setWeightFromHealth(false)
        }
      }).catch(() => {})
    } else if (summary.weightKg != null) {
      setWeightInput(String(summary.weightKg))
      setWeightFromHealth(false)
    } else {
      setWeightInput('')
      setWeightFromHealth(false)
    }
    return () => { cancelled = true }
  }, [summary, isToday])

  // HealthKit steps + active calories
  useEffect(() => {
    let cancelled = false
    if (isToday && isHealthKitSupported()) {
      requestHealthPermissions().then(() => {
        if (!cancelled) {
          getTodaySteps().then(v => { if (!cancelled) setSteps(v) })
          getTodayActiveCalories().then(v => { if (!cancelled) setActiveCalories(v) })
        }
      })
    } else {
      setSteps(0)
      setActiveCalories(0)
    }
    return () => { cancelled = true }
  }, [isToday, refreshToken])

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 4) return
      ptrStartY.current = e.touches[0].clientY
      ptrDragging.current = false
    }
    function onTouchMove(e: TouchEvent) {
      if (!ptrStartY.current) return
      const dy = e.touches[0].clientY - ptrStartY.current
      if (dy <= 0) { ptrStartY.current = 0; return }
      if (!ptrDragging.current && dy > 8) ptrDragging.current = true
      if (!ptrDragging.current) return
      const dist = Math.min(dy * 0.5, PTR_THRESHOLD * 1.4)
      pullRef.current = dist
      setPullDist(dist)
    }
    function onTouchEnd() {
      if (!ptrDragging.current) return
      ptrDragging.current = false
      ptrStartY.current = 0
      if (pullRef.current >= PTR_THRESHOLD) {
        hapticMedium()
        setPtrRefreshing(true)
        refetchSummary()
      }
      setPullDist(0)
      pullRef.current = 0
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  function applyMealOptimistic(kcal: number, protein: number, fat: number, fiber: number, carbs: number) {
    const key = ['today-summary', selectedDate]
    const prev = queryClient.getQueryData<TodaySummary>(key)
    if (prev) {
      queryClient.setQueryData<TodaySummary>(key, {
        ...prev,
        consumedCalories: prev.consumedCalories + kcal,
        proteinGrams: prev.proteinGrams + protein,
        fatGrams: prev.fatGrams + fat,
        fiberGrams: prev.fiberGrams + fiber,
        carbsGrams: prev.carbsGrams + carbs,
        remainingCalories: prev.remainingCalories - kcal,
      })
    }
    return prev
  }

  async function handleTemplateLog(templateId: string, slotType?: string) {
    const key = ['today-summary', selectedDate]
    await queryClient.cancelQueries({ queryKey: key })
    const prev = queryClient.getQueryData<TodaySummary>(key)
    try {
      await logTemplate(templateId, selectedDate, slotType)
      await refetchSummary()
      onDayUpdated?.()
    } catch (err) {
      if (prev) queryClient.setQueryData(key, prev)
      throw err
    }
  }

  async function handleMealAdd(kcal: number, protein: number, fat: number, fiber: number, carbs: number, name?: string, slotType?: string) {
    const key = ['today-summary', selectedDate]
    await queryClient.cancelQueries({ queryKey: key })
    const prev = applyMealOptimistic(kcal, protein, fat, fiber, carbs)
    setShowQuickAdd(false)
    setSavingNutrition(true)
    try {
      await addMealManually({ caloriesConsumedKcal: kcal, proteinGrams: protein, fatGrams: fat, fiberGrams: fiber, carbsGrams: carbs, mealName: name, slotType }, selectedDate)
      await refetchSummary()
      onDayUpdated?.()
    } catch (err) {
      if (prev) queryClient.setQueryData(key, prev)
      setActionError(err instanceof Error ? err.message : 'Failed to add meal')
    } finally {
      setSavingNutrition(false)
    }
  }

  function openQuickAdd(slotType?: string) {
    if (slotType) {
      // Explicit entry from a slot row — slot is unambiguous.
      setQuickAddSlot(slotType)
      setShowQuickAdd(true)
    } else {
      // Global entry — ask the user which meal before opening the sheet.
      setSlotPickerVisible(true)
    }
  }

  function handleSlotPicked(slot: MealSlot['slotType']) {
    setSlotPickerVisible(false)
    setQuickAddSlot(slot)
    setShowQuickAdd(true)
  }

  async function handleCopyFromYesterday() {
    const yesterday = offsetDate(selectedDate, -1)
    const slots = await listMealLog(yesterday)
    const items = slots.flatMap(slot =>
      slot.items.map(item => ({
        caloriesConsumedKcal: item.caloriesKcal,
        proteinGrams: item.proteinG,
        fatGrams: item.fatG,
        fiberGrams: item.fiberG,
        carbsGrams: item.carbsG,
        mealName: item.name,
        slotType: slot.slotType,
      }))
    )
    if (items.length === 0) return
    await Promise.all(items.map(item => addMealManually(item, selectedDate)))
    await refetchSummary()
    onDayUpdated?.()
  }

  async function handleResetDay() {
    if (!window.confirm('Reset this day\'s nutrition totals to zero?')) return
    setResettingDay(true)
    setActionError('')
    try {
      await resetToday(selectedDate)
      await refetchSummary()
      onDayUpdated?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reset day')
    } finally {
      setResettingDay(false)
    }
  }

  async function handleWeightSave() {
    const normalizedWeightInput = weightInput.trim().replace(',', '.')
    const parsedWeight = Number(normalizedWeightInput)

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 200) {
      setActionError('Enter a valid weight between 1 and 200 kg')
      return
    }

    setSavingWeight(true)
    setActionError('')

    try {
      await updateTodayWeight(parsedWeight, selectedDate)
      await refetchSummary()
      const updated = queryClient.getQueryData<TodaySummary>(['today-summary', selectedDate])
      setWeightInput(updated?.weightKg != null ? String(updated.weightKg) : '')
      setWeightFromHealth(false)
      onDayUpdated?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save weight')
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

  const ptrPct = Math.min(1, pullDist / PTR_THRESHOLD)
  const showPtr = pullDist > 4 || ptrRefreshing

  return (
    <section className="screen-section screen-section--home-dark">
      {showPtr && (
        <div className="ptr-indicator" style={{ height: ptrRefreshing ? 40 : pullDist * 0.6 }}>
          <div className={`ptr-indicator__icon${ptrRefreshing ? ' ptr-indicator__icon--spin' : ''}`}
               style={{ opacity: ptrRefreshing ? 1 : ptrPct, transform: `rotate(${ptrPct * 180}deg)` }}>
            ↓
          </div>
        </div>
      )}
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
        <div className="day-nav__label-wrap">
          <span className={`day-nav__label${!isToday ? ' day-nav__label--past' : ''}`}>
            {dateLabel}
          </span>
          <input
            type="date"
            className="day-nav__date-overlay"
            min={minDate}
            max={today}
            value={selectedDate}
            onChange={e => { if (e.target.value && e.target.value <= today) setSelectedDate(e.target.value) }}
          />
        </div>
        <button
          type="button"
          className="day-nav__btn"
          onClick={goToNextDay}
          disabled={isToday}
          aria-label="Next day"
        >
          →
        </button>
        {!isToday && (
          <button
            type="button"
            className="day-nav__today-chip"
            onClick={() => setSelectedDate(today)}
            aria-label="Go to today"
          >
            Today
          </button>
        )}
      </div>

      {isToday && (
        <div className="mascot-hero-card">
          <MascotSvg mood={getMascotMood(summary)} size={100} className="mascot-hero-card__image" />
          <div className="mascot-hero-card__text">
            <p className="mascot-hero-card__greeting">{getGreeting(summary, displayName)}</p>
            {summary && summary.loggingStreakDays >= 2 && (
              <span className="streak-badge">🔥 {summary.loggingStreakDays} days</span>
            )}
          </div>
        </div>
      )}

      {successMessage ? <section className="panel detail-panel"><p className="success-text">{successMessage}</p></section> : null}
      {loading ? (
        <>
          {/* Greeting card — matches .mascot-hero-card */}
          <div className="mascot-hero-card">
            <div className="skeleton skeleton--circle" style={{ width: 100, height: 100, flexShrink: 0 }} />
            <div className="skeleton-col" style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: '1.1rem', width: '70%' }} />
              <div className="skeleton" style={{ height: '0.85rem', width: '40%' }} />
            </div>
          </div>
          {/* Calories ring card */}
          <div className="today-dark-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div className="skeleton" style={{ height: '1.1rem', width: '5rem', alignSelf: 'flex-start' }} />
            <div className="skeleton skeleton--circle" style={{ width: 160, height: 160 }} />
            <div className="skeleton" style={{ height: '0.85rem', width: '50%' }} />
          </div>
          {/* Meals card */}
          <div className="today-dark-card">
            <div className="skeleton" style={{ height: '1.1rem', width: '6rem', marginBottom: 14 }} />
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: '3rem', marginTop: 8, borderRadius: '14px' }} />
            ))}
          </div>
          {/* Water intake card */}
          <div className="today-dark-card">
            <div className="skeleton" style={{ height: '1.1rem', width: '4rem', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="skeleton skeleton--circle" style={{ width: 28, height: 28 }} />
              ))}
            </div>
          </div>
        </>
      ) : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? (
        <>
          <div className="content-fade-in">
            <TodaySummaryBlock
              summary={summary}
              date={selectedDate}
              steps={steps}
              activeCalories={activeCalories}
              weightInput={weightInput}
              weightFromHealth={weightFromHealth}
              savingWeight={savingWeight}
              onWeightChange={(v) => { setWeightInput(v); setWeightFromHealth(false) }}
              onWeightSave={handleWeightSave}
            />
          </div>
          {isToday && <WellbeingDailyPrompt date={selectedDate} />}
          {isToday && <WeeklyRecapCard />}
          {isToday && <CoachInsightsCard date={selectedDate} />}
          {showCoachTour && (
            <CoachTour onClose={() => { markCoachTourSeen(); setShowCoachTour(false) }} />
          )}
          {isToday && (
            <div className="content-fade-in" style={{ animationDelay: '20ms' }}>
              <WeeklyBankCard refreshToken={refreshToken} />
            </div>
          )}
          <div className="content-fade-in" style={{ animationDelay: '40ms' }}>
            <MealsLogCard
              date={selectedDate}
              refreshToken={refreshToken}
              onAddToSlot={openQuickAdd}
              onDeleted={() => { refetchSummary() }}
              onUpdated={() => { refetchSummary(); onDayUpdated?.() }}
              onCopyFromYesterday={isToday ? handleCopyFromYesterday : undefined}
            />
          </div>
          <div className="content-fade-in" style={{ animationDelay: '80ms' }}>
            <WaterIntakeCard
              waterGlasses={summary.waterGlasses}
              waterGoalGlasses={summary.waterGoalGlasses}
              date={selectedDate}
              onUpdate={() => { refetchSummary() }}
            />
          </div>
        </>
      ) : null}

      {!loading && summary ? (
        <button type="button" className="quick-add-fab" onClick={() => { hapticLight(); openQuickAdd() }} aria-label="Quick add food">
          <span className="quick-add-fab__icon">+</span>
          <span className="quick-add-fab__label">Add food</span>
        </button>
      ) : null}

      {showQuickAdd && (
        <QuickAddSheet
          initialSlot={quickAddSlot}
          onAdd={handleMealAdd}
          onLogTemplate={handleTemplateLog}
          onClose={() => setShowQuickAdd(false)}
          onOpenAnalyzer={onOpenAnalyzer}
          onOpenAnalyzerWithPhoto={onOpenAnalyzerWithPhoto}
          onOpenLibrary={onOpenLibrary}
        />
      )}

      {slotPickerVisible && (
        <MealSlotPickerPopup
          suggested={defaultSlotByTime()}
          onPick={handleSlotPicked}
          onCancel={() => setSlotPickerVisible(false)}
        />
      )}

    </section>
  )
}
