import { useEffect, useRef, useState } from 'react'
import type { TodaySummary } from '../../../shared/types/nutrition'
import { CalorieBankBadge } from '../../calorie-bank/components/CalorieBankBadge'
import { useCalorieBank } from '../../calorie-bank/model/useCalorieBank'

function getCaptionText(consumed: number, target: number, remaining: number): string {
  if (consumed === 0)           return 'A blank canvas. A legendary opportunity.'
  if (remaining > target * 0.7) return "Plenty of room. Don't waste it on salad."
  if (remaining > target * 0.4) return 'On track. Suspicious, but on track.'
  if (remaining > target * 0.15) return 'Getting tight. Choose wisely.'
  if (remaining > 0)            return 'You could still eat a small horse. A very small one.'
  if (remaining === 0)          return "Congrats, you've eaten yourself into tomorrow's problem."
  return 'Bold. Absolutely bold.'
}

interface MacroCardProps {
  label: string
  value: number
  target: number
  unit: string
  progress: number
  tone: 'purple' | 'orange' | 'pink' | 'teal'
}

function MacroCard({ label, value, target, unit, progress, tone }: MacroCardProps) {
  return (
    <article className="macro-meter-card">
      <div className="macro-meter-card__header">
        <span>{label}</span>
        <strong>
          {Math.round(value)}
          <span style={{ opacity: 0.45, fontWeight: 400 }}>/{Math.round(target)}</span>
          <span>{unit}</span>
        </strong>
      </div>
      <div className="macro-meter-card__track">
        <span className={`macro-meter-card__fill macro-meter-card__fill--${tone}`} style={{ width: `${progress}%` }} />
      </div>
    </article>
  )
}

interface TodaySummaryBlockProps {
  summary: TodaySummary
  date: string
  steps?: number
  activeCalories?: number
  weightInput?: string
  weightFromHealth?: boolean
  savingWeight?: boolean
  onWeightChange?: (v: string) => void
  onWeightSave?: () => void
}

export function TodaySummaryBlock({
  summary,
  date,
  steps = 0,
  activeCalories = 0,
  weightInput = '',
  weightFromHealth = false,
  savingWeight = false,
  onWeightChange,
  onWeightSave,
}: TodaySummaryBlockProps) {
  const { snapshot: bankSnapshot } = useCalorieBank(date)
  const [showMacros, setShowMacros] = useState(false)
  const macrosPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showMacros) {
      setTimeout(() => {
        macrosPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [showMacros])

  const consumed = Math.round(summary.consumedCalories)
  const target = Math.max(1, Math.round(summary.dailyTargetCalories))
  const remaining = target - consumed
  const ratio = consumed / (target || 1)
  const ringProgress = Math.min(100, Math.max(0, Math.round(ratio * 100)))
  const circumference = 2 * Math.PI * 64
  const dashOffset = circumference - (circumference * ringProgress) / 100
  const ringGradId = ratio >= 1 ? 'ringGradDanger' : ratio >= 0.85 ? 'ringGradWarning' : 'ringGradNormal'

  return (
    <section className="today-summary today-summary--dark" aria-label="Сводка питания за день">
      <article className="today-dark-card">
        <div className="today-dark-card__topbar today-dark-card__topbar--split">
          <p className="today-dark-card__title">Calories</p>
          <button
            type="button"
            className={`today-card-details-toggle${showMacros ? '' : ' today-card-details-toggle--pill'}`}
            onClick={() => setShowMacros(v => !v)}
          >
            {showMacros ? 'Hide ▴' : (
              <span className="today-macros-preview">
                <span className="today-macros-preview__item today-macros-preview__item--p">P {Math.round(summary.proteinGrams)}</span>
                <span className="today-macros-preview__dot">·</span>
                <span className="today-macros-preview__item today-macros-preview__item--f">F {Math.round(summary.fatGrams)}</span>
                <span className="today-macros-preview__dot">·</span>
                <span className="today-macros-preview__item today-macros-preview__item--c">C {Math.round(summary.carbsGrams)}</span>
                <span className="today-macros-preview__chevron"> ▾</span>
              </span>
            )}
          </button>
        </div>

        <div className="today-dark-ring-layout">
          <div className="today-side-stat">
            <strong>{consumed}</strong>
            <span>EATEN</span>
          </div>

          <div className="today-ring">
            <svg viewBox="0 0 160 160" className="today-ring__svg" aria-hidden="true">
              <defs>
                <linearGradient id="ringGradNormal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b7dff" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <linearGradient id="ringGradWarning" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="ringGradDanger" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="64" className="today-ring__track" />
              <circle
                cx="80"
                cy="80"
                r="64"
                className="today-ring__progress"
                stroke={`url(#${ringGradId})`}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="today-ring__center">
              <strong>{Math.max(0, remaining)}</strong>
              <span>kcal left</span>
            </div>
          </div>

          <div className="today-side-stat">
            <strong>{target}</strong>
            <span>TARGET</span>
          </div>
        </div>

        <p className="today-ring__caption">{getCaptionText(consumed, target, Math.max(0, remaining))}</p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CalorieBankBadge snapshot={bankSnapshot} date={date} consumedRatio={ratio} />
        </div>

        {(steps > 0 || activeCalories > 0) && (
          <div className="activity-row">
            {steps > 0 && (
              <div className="activity-chip">
                <span className="activity-chip__icon">👟</span>
                <span className="activity-chip__value">{steps.toLocaleString()}</span>
                <span className="activity-chip__label">steps</span>
              </div>
            )}
            {activeCalories > 0 && (
              <div className="activity-chip activity-chip--earned">
                <span className="activity-chip__icon">🔥</span>
                <span className="activity-chip__value">{activeCalories}</span>
                <span className="activity-chip__label">kcal burned</span>
              </div>
            )}
          </div>
        )}

        {showMacros && (
          <>
            <div ref={macrosPanelRef} className="macro-meter-grid">
              <MacroCard label="Protein" value={summary.proteinGrams} target={summary.proteinTargetGrams} unit="g" progress={Math.min(100, Math.round((summary.proteinGrams / Math.max(1, summary.proteinTargetGrams)) * 100))} tone="purple" />
              <MacroCard label="Fat"     value={summary.fatGrams}     target={summary.fatTargetGrams}     unit="g" progress={Math.min(100, Math.round((summary.fatGrams     / Math.max(1, summary.fatTargetGrams))     * 100))} tone="orange" />
              <MacroCard label="Carbs"   value={summary.carbsGrams}   target={summary.carbsTargetGrams}   unit="g" progress={Math.min(100, Math.round((summary.carbsGrams   / Math.max(1, summary.carbsTargetGrams))   * 100))} tone="teal" />
              <MacroCard label="Fiber"   value={summary.fiberGrams}   target={summary.fiberTargetGrams}   unit="g" progress={Math.min(100, Math.round((summary.fiberGrams   / Math.max(1, summary.fiberTargetGrams))   * 100))} tone="pink" />
            </div>

            {summary.targetWeightKg != null && summary.startingWeightKg != null ? (
              <WeightGoalProgress
                currentWeightKg={summary.weightKg}
                startingWeightKg={summary.startingWeightKg}
                targetWeightKg={summary.targetWeightKg}
              />
            ) : (
              <div className="today-insight-card">
                <div className="today-insight-card__emoji">⚡</div>
                <h3>Today insight</h3>
                <p>
                  {summary.weightKg == null
                    ? 'Your scale is getting bored.'
                    : `Weight logged: ${summary.weightKg.toFixed(1)} kg. Keep going.`}
                </p>
              </div>
            )}
          </>
        )}

        {onWeightChange && onWeightSave && (
          <div className="today-weight-row">
            <span className="today-weight-row__label">Weight</span>
            <input
              className="today-weight-row__input"
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={e => { onWeightChange(e.target.value) }}
              placeholder="82.4"
            />
            <span className="today-weight-row__unit">kg</span>
            {weightFromHealth && <span className="today-weight-row__hint">· Apple Health</span>}
            {!weightFromHealth && summary.weightTrend7d != null && summary.weightTrend7d !== 0 && (
              <span className={`today-weight-trend${summary.weightTrend7d < 0 ? ' today-weight-trend--down' : ' today-weight-trend--up'}`}>
                {summary.weightTrend7d > 0 ? '↑' : '↓'} {Math.abs(summary.weightTrend7d).toFixed(1)} kg / wk
              </span>
            )}
            <button
              type="button"
              className="today-weight-row__save"
              onClick={onWeightSave}
              disabled={savingWeight}
            >
              {savingWeight ? '…' : 'Save'}
            </button>
          </div>
        )}
      </article>
    </section>
  )
}

function WeightGoalProgress({
  currentWeightKg,
  startingWeightKg,
  targetWeightKg,
}: {
  currentWeightKg: number | null
  startingWeightKg: number
  targetWeightKg: number
}) {
  const isLoss = targetWeightKg < startingWeightKg
  const totalDelta = Math.abs(targetWeightKg - startingWeightKg)

  let progress = 0
  let remaining: number | null = null
  let currentDisplay = currentWeightKg

  if (currentWeightKg != null && totalDelta > 0) {
    const done = isLoss
      ? startingWeightKg - currentWeightKg
      : currentWeightKg - startingWeightKg
    progress = Math.min(100, Math.max(0, (done / totalDelta) * 100))
    remaining = isLoss
      ? currentWeightKg - targetWeightKg
      : targetWeightKg - currentWeightKg
  }

  const reached = remaining != null && remaining <= 0
  const emoji = reached ? '🏆' : isLoss ? '📉' : '📈'

  return (
    <div className="weight-goal-card">
      <div className="weight-goal-card__header">
        <span className="weight-goal-card__emoji">{emoji}</span>
        <span className="weight-goal-card__title">Weight goal</span>
        {remaining != null && remaining > 0 ? (
          <span className="weight-goal-card__badge">{remaining.toFixed(1)} kg to go</span>
        ) : reached ? (
          <span className="weight-goal-card__badge weight-goal-card__badge--reached">Goal reached!</span>
        ) : (
          <span className="weight-goal-card__badge weight-goal-card__badge--pending">Log your weight</span>
        )}
      </div>
      <div className="weight-goal-card__bar-wrap">
        <div className="weight-goal-card__bar">
          <div className="weight-goal-card__fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="weight-goal-card__labels">
          <span>{startingWeightKg} kg</span>
          {currentDisplay != null ? (
            <span className="weight-goal-card__current">{currentDisplay.toFixed(1)} kg now</span>
          ) : null}
          <span>{targetWeightKg} kg</span>
        </div>
      </div>
    </div>
  )
}
