import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNutritionStatistics } from '../model/statisticsApi'
import { MascotSvg } from '../../current-day/components/MascotSvg'
import type { NutritionStatisticsPoint, NutritionStatisticsResponse } from '../../../shared/types/nutrition'

const RANGE_OPTIONS = [7, 30, 90] as const

type RangeDays = (typeof RANGE_OPTIONS)[number]

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return `${value}`
}

function formatShortDate(value: string): string {
  const [, , day] = value.split('-')
  return day
}

function formatExpandedDate(value: string): string {
  const [, month, day] = value.split('-')
  return `${day}.${month}`
}

function buildLinePath(values: Array<number | null>, width: number, height: number, min: number, max: number) {
  if (values.length === 0) {
    return ''
  }

  const range = Math.max(1, max - min)
  let hasStarted = false

  return values
    .map((value, index) => {
      if (value == null) {
        hasStarted = false
        return ''
      }

      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      const command = hasStarted ? 'L' : 'M'
      hasStarted = true
      return `${command} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(' ')
}

function buildFillPath(values: Array<number | null>, width: number, height: number, min: number, max: number): string {
  const linePath = buildLinePath(values, width, height, min, max)
  if (!linePath) return ''
  let firstIdx = -1, lastIdx = -1
  for (let i = 0; i < values.length; i++) {
    if (values[i] != null) { if (firstIdx === -1) firstIdx = i; lastIdx = i }
  }
  if (firstIdx === -1) return ''
  const firstX = values.length === 1 ? width / 2 : (firstIdx / (values.length - 1)) * width
  const lastX  = values.length === 1 ? width / 2 : (lastIdx  / (values.length - 1)) * width
  return `${linePath} L ${lastX.toFixed(1)} ${height} L ${firstX.toFixed(1)} ${height} Z`
}

function formatMetricValue(value: number | null | undefined, digits = 2): string {
  if (value == null) {
    return '—'
  }
  return value.toFixed(digits)
}

function localDateString(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return localDateString(d)
}

function computeStreak(points: NutritionStatisticsPoint[]): number {
  const sorted = [...points].sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  const logged = sorted.filter(p => p.consumedCalories > 0)
  if (logged.length === 0) return 0
  const last = logged[logged.length - 1]
  const today = localDateString(new Date())
  const yesterday = prevDay(today)
  if (last.entryDate !== today && last.entryDate !== yesterday) return 0
  let streak = 0
  let expected = last.entryDate
  for (let i = logged.length - 1; i >= 0; i--) {
    if (logged[i].entryDate === expected) {
      streak++
      expected = prevDay(expected)
    } else {
      break
    }
  }
  return streak
}

function movingAvg(points: NutritionStatisticsPoint[], window = 5): Array<number | null> {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1)
    const weights = slice.map(p => p.weightKg).filter((w): w is number => w != null)
    return weights.length >= 3 ? weights.reduce((a, b) => a + b, 0) / weights.length : null
  })
}

function getChartBounds({
  values,
  targets,
  trendline,
  valueKey,
  goalLine,
}: {
  values: Array<number | null>
  targets: Array<number | null>
  trendline?: Array<number | null>
  valueKey: 'weightKg' | 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams' | 'carbsGrams'
  goalLine?: number | null
}) {
  const numericValues = values.filter((value): value is number => value != null)
  const numericTargets = targets.filter((value): value is number => value != null)
  const numericTrend = (trendline ?? []).filter((v): v is number => v != null)

  if (numericValues.length === 0 && numericTargets.length === 0) {
    return { min: 0, max: 1 }
  }

  if (valueKey === 'weightKg' && numericValues.length > 0) {
    const allW = [...numericValues, ...numericTrend, ...(goalLine != null ? [goalLine] : [])]
    const rawMin = Math.min(...allW)
    const rawMax = Math.max(...allW)
    const spread = rawMax - rawMin
    const visualRange = Math.max(spread, 1.5)
    const center = (rawMin + rawMax) / 2
    const padding = Math.max(0.2, visualRange * 0.12)

    return {
      min: center - visualRange / 2 - padding,
      max: center + visualRange / 2 + padding,
    }
  }

  return {
    min: Math.min(0, ...numericValues, ...numericTargets),
    max: Math.max(1, ...numericValues, ...numericTargets),
  }
}

function MetricCard({ title, value, detail, tone = 'neutral', emoji = '•' }: { title: string; value: string; detail: string; tone?: 'neutral' | 'good' | 'bad'; emoji?: string }) {
  return (
    <section className={`stats-metric-card stats-metric-card--${tone}`}>
      <div className="stats-metric-card__top">
        <span>{title}</span>
        <span className="stats-metric-card__emoji" aria-hidden="true">{emoji}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  )
}

function RangeSelector({ value, onChange }: { value: RangeDays; onChange: (value: RangeDays) => void }) {
  return (
    <div className="range-selector" role="tablist" aria-label="Statistics range">
      {RANGE_OPTIONS.map((days) => {
        const label = days === 7 ? '7d' : days === 30 ? '30d' : '90d'
        return (
          <button
            key={days}
            type="button"
            className={`range-selector__button ${value === days ? 'range-selector__button--active' : ''}`}
            onClick={() => onChange(days)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function CalorieBarChart({ points }: { points: NutritionStatisticsPoint[] }) {
  const W = 600
  // Layout: [label row 28px] [chart 160px] [dates row 28px] = 216
  const labelH = 28, chartH = 160, dateH = 28
  const H = labelH + chartH + dateH
  const midY = labelH + chartH / 2
  const logged = points.filter(p => p.consumedCalories > 0)
  const maxAbs = Math.max(200, ...logged.map(p => Math.abs(p.calorieBalance)))
  const gap = W / Math.max(points.length, 1)
  const barW = Math.max(5, gap * 0.6)
  const dateLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1]

  return (
    <div className="cal-bar-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="cal-bar-chart__svg">
        {/* top label row: "surplus ↑" left, "±N kcal" right */}
        <text x={4} y={20} fontSize="22" fill="rgba(239,68,68,0.6)">surplus ↑</text>
        <text x={W - 4} y={20} fontSize="22" className="cal-bar__label-kcal" textAnchor="end">±{Math.round(maxAbs)} kcal</text>

        {/* guide lines */}
        {[1, 0.5].map(pct => {
          const yT = midY - pct * (chartH / 2 - 2)
          const yB = midY + pct * (chartH / 2 - 2)
          return (
            <g key={pct}>
              <line x1={0} y1={yT} x2={W} y2={yT} className="cal-bar__guideline" strokeWidth="1" />
              <line x1={0} y1={yB} x2={W} y2={yB} className="cal-bar__guideline" strokeWidth="1" />
            </g>
          )
        })}
        {/* zero line */}
        <line x1={0} y1={midY} x2={W} y2={midY} className="cal-bar__zeroline" strokeWidth="1.5" />

        {/* bars — only for days with logged calories */}
        {points.map((p, i) => {
          if (p.consumedCalories === 0) return null
          const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
          const barH = Math.max(2, (Math.abs(p.calorieBalance) / maxAbs) * (chartH / 2 - 6))
          const isOver = p.calorieBalance >= 0
          return (
            <rect key={p.entryDate}
              x={x - barW / 2} y={isOver ? midY - barH : midY}
              width={barW} height={barH}
              className={isOver ? 'calorie-bar--over' : 'calorie-bar--under'}
              rx="3"
            />
          )
        })}

        {/* bottom label row: "deficit ↓" left, dates right-aligned */}
        <text x={4} y={labelH + chartH + 22} fontSize="22" fill="rgba(34,197,94,0.6)">deficit ↓</text>
        {points.map((p, i) => {
          if (!dateLabels.includes(i)) return null
          const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
          const anchor = i === 0 ? 'middle' : i === points.length - 1 ? 'end' : 'middle'
          // skip first date label — it would overlap "deficit ↓"
          if (i === 0) return null
          return (
            <text key={p.entryDate} x={x} y={labelH + chartH + 22} fontSize="22" className="cal-bar__date" textAnchor={anchor}>
              {formatShortDate(p.entryDate)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function ChartModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="chart-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="chart-modal__content panel" onClick={(event) => event.stopPropagation()}>
        <div className="chart-modal__header">
          <div>
            <p className="screen-header__eyebrow">Statistics</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="chart-modal__close" onClick={onClose} aria-label="Close chart">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function LineChart({
  title,
  unit,
  points,
  valueKey,
  targetKey,
  colorClass,
  gradColor,
  trendline,
  goalLine,
}: {
  title: string
  unit: string
  points: NutritionStatisticsPoint[]
  valueKey: 'weightKg' | 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams' | 'carbsGrams'
  targetKey?: 'calorieTarget'
  colorClass: string
  gradColor: string
  trendline?: Array<number | null>
  goalLine?: number | null
}) {
  const values = points.map((point) => point[valueKey] ?? null)
  const targets = targetKey ? points.map((point) => point[targetKey] ?? null) : []
  const width = 760
  const height = 180
  const { min, max } = getChartBounds({ values, targets, trendline, valueKey, goalLine })
  const range = Math.max(1, max - min)

  const valuePath    = buildLinePath(values, width, height, min, max)
  const fillPath     = buildFillPath(values, width, height, min, max)
  const targetPath   = targets.length > 0 ? buildLinePath(targets, width, height, min, max) : ''
  const trendlinePath = trendline ? buildLinePath(trendline, width, height, min, max) : ''

  const guideValues = [min, (min + max) / 2, max]
  const dateAxisIndexes = (() => {
    if (points.length === 0) return []
    const mid = Math.floor((points.length - 1) / 2)
    return [...new Set([0, mid, points.length - 1])].sort((a, b) => a - b)
  })()

  // latest non-null value + dot position
  let lastNonNullIdx = -1
  for (let i = values.length - 1; i >= 0; i--) { if (values[i] != null) { lastNonNullIdx = i; break } }
  const latestValue = lastNonNullIdx >= 0 ? values[lastNonNullIdx] : null
  const dotX = lastNonNullIdx >= 0 ? (values.length === 1 ? width / 2 : (lastNonNullIdx / (values.length - 1)) * width) : null
  const dotY = latestValue != null ? height - ((latestValue - min) / range) * height : null
  const gradId = `grad-${title.toLowerCase().replace(/\s+/g, '-')}`

  const numericValues = values.filter((v): v is number => v != null)
  const avgValue = numericValues.length > 0
    ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    : null
  const formattedAvg = avgValue != null
    ? (valueKey === 'weightKg' ? avgValue.toFixed(1) : Math.round(avgValue).toString())
    : null

  const chartContent = (
    <div className="line-chart line-chart--dark-card">
      <div className="line-chart__canvas line-chart__canvas--dark">
        <div className="line-chart__plot">
          <div className={`line-chart__grid line-chart__grid--dark ${valueKey === 'weightKg' ? 'line-chart__grid--hidden' : ''}`}>
            {guideValues.map((guide) => (
              <span key={`${title}-grid-${guide}`} />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart__svg" role="img" aria-label={title}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={gradColor} stopOpacity="0.32" />
                <stop offset="80%"  stopColor={gradColor} stopOpacity="0.04" />
                <stop offset="100%" stopColor={gradColor} stopOpacity="0"    />
              </linearGradient>
            </defs>
            {fillPath ? <path d={fillPath} fill={`url(#${gradId})`} stroke="none" /> : null}
            <path d={valuePath} className={`line-chart__path ${colorClass} line-chart__path--glow`} />
            {targetPath ? <path d={targetPath} className="line-chart__path line-chart__path--target" /> : null}
            {trendlinePath ? <path d={trendlinePath} className="line-chart__path line-chart__path--trendline" /> : null}
            {goalLine != null ? (() => {
              const goalY = height - ((goalLine - min) / range) * height
              return (
                <g>
                  <line x1={0} y1={goalY.toFixed(1)} x2={width} y2={goalY.toFixed(1)} className="line-chart__path--goal-line" strokeDasharray="6 4" strokeWidth="1.5" stroke="rgba(251,191,36,0.7)" />
                  <text x={width - 4} y={goalY - 5} fontSize="20" textAnchor="end" fill="rgba(251,191,36,0.8)">{goalLine} kg</text>
                </g>
              )
            })() : null}
            {dotX != null && dotY != null ? (
              <circle cx={dotX.toFixed(1)} cy={dotY.toFixed(1)} r="7" fill={gradColor} className="line-chart__dot" strokeWidth="2.5" />
            ) : null}
          </svg>
          <div className="line-chart__axis line-chart__axis--x">
            {dateAxisIndexes.map(i => (
              <span key={points[i].entryDate}>{formatExpandedDate(points[i].entryDate)}</span>
            ))}
          </div>
        </div>
      </div>
      {(trendline && trendline.some(v => v != null)) || goalLine != null ? (
        <div className="chart-legend">
          {trendline && trendline.some(v => v != null) ? (
            <>
              <span className="chart-legend__item">
                <span className="chart-legend__line chart-legend__line--solid" style={{ background: gradColor }} />
                Weight
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__line chart-legend__line--dashed" />
                5-day trend
              </span>
            </>
          ) : null}
          {goalLine != null ? (
            <span className="chart-legend__item">
              <span className="chart-legend__line chart-legend__line--dashed" style={{ background: 'rgba(251,191,36,0.7)' }} />
              Goal: {goalLine} kg
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  return (
    <section className="panel statistics-panel statistics-panel--dark">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">Metric</p>
          <h3>{title}</h3>
        </div>
        {formattedAvg != null && (
          <span className="chart-latest-value">
            <span className="chart-latest-unit">avg </span>{formattedAvg}<span className="chart-latest-unit"> {unit}</span>
          </span>
        )}
      </div>
      {chartContent}
    </section>
  )
}

interface Insight {
  id: string
  icon: string
  title: string
  body: string
  tone: 'good' | 'bad' | 'neutral' | 'info'
}

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function computeInsights(
  loggedPoints: NutritionStatisticsPoint[],
  allPoints: NutritionStatisticsPoint[],
  targetWeightKg: number | null,
  rangeDays: number,
): Insight[] {
  if (loggedPoints.length === 0) return []
  const insights: Insight[] = []

  // 1. Logging consistency
  const pct = (loggedPoints.length / rangeDays) * 100
  if (pct < 60) {
    insights.push({
      id: 'consistency-low',
      icon: '📅',
      title: 'Logging gaps',
      body: `${loggedPoints.length} of ${rangeDays} days logged (${Math.round(pct)}%). Missing days hide the full picture.`,
      tone: 'bad',
    })
  } else if (pct >= 85) {
    insights.push({
      id: 'consistency-high',
      icon: '✅',
      title: 'Consistent tracker',
      body: `${Math.round(pct)}% of days logged. Consistency is the #1 predictor of long-term results.`,
      tone: 'good',
    })
  }

  // 2. Momentum — first half vs second half average calorie balance
  if (loggedPoints.length >= 6) {
    const mid = Math.floor(loggedPoints.length / 2)
    const avgFirst  = loggedPoints.slice(0, mid).reduce((s, p) => s + p.calorieBalance, 0) / mid
    const avgSecond = loggedPoints.slice(mid).reduce((s, p) => s + p.calorieBalance, 0) / (loggedPoints.length - mid)
    const delta = avgFirst - avgSecond // positive = recent half is better (lower balance)
    if (delta > 100) {
      insights.push({
        id: 'momentum-improving',
        icon: '📈',
        title: 'Improving momentum',
        body: `Recent days are ${Math.round(delta)} kcal/day better vs the earlier half of this period.`,
        tone: 'good',
      })
    } else if (delta < -100) {
      insights.push({
        id: 'momentum-declining',
        icon: '📉',
        title: 'Momentum slipping',
        body: `Recent days are ${Math.round(-delta)} kcal/day worse than the earlier half. Time to refocus.`,
        tone: 'bad',
      })
    }
  }

  // 3. Worst day-of-week (needs ≥14 logged days, ≥2 per DOW)
  if (loggedPoints.length >= 14) {
    const byDow: Record<number, number[]> = {}
    for (const p of loggedPoints) {
      const dow = new Date(p.entryDate + 'T12:00:00').getDay()
      byDow[dow] = byDow[dow] ?? []
      byDow[dow].push(p.calorieBalance)
    }
    let worstDow = -1, worstAvg = -Infinity
    for (const [dow, balances] of Object.entries(byDow)) {
      if (balances.length < 2) continue
      const avg = balances.reduce((s, v) => s + v, 0) / balances.length
      if (avg > worstAvg) { worstAvg = avg; worstDow = Number(dow) }
    }
    if (worstDow >= 0 && worstAvg > 100) {
      insights.push({
        id: 'worst-dow',
        icon: '📆',
        title: `${DOW_NAMES[worstDow]}s are tough`,
        body: `Avg surplus of +${Math.round(worstAvg)} kcal on ${DOW_NAMES[worstDow]}s. Plan that day more carefully.`,
        tone: 'bad',
      })
    }
  }

  // 4. High day-to-day variance (≥7 logged days, std dev > 600, avg balance positive)
  if (loggedPoints.length >= 7) {
    const balances = loggedPoints.map(p => p.calorieBalance)
    const avgBal = balances.reduce((s, v) => s + v, 0) / balances.length
    const stdDev = Math.sqrt(balances.reduce((s, v) => s + (v - avgBal) ** 2, 0) / balances.length)
    if (stdDev > 600 && avgBal > 0) {
      insights.push({
        id: 'high-variance',
        icon: '🎢',
        title: 'Feast-or-famine pattern',
        body: `High day-to-day variance (σ ${Math.round(stdDev)} kcal). Steady days beat big swings.`,
        tone: 'neutral',
      })
    }
  }

  // 5. Weight goal ETA (≥4 weight entries + target set)
  if (targetWeightKg != null) {
    const wPoints = allPoints.filter(p => p.weightKg != null)
    if (wPoints.length >= 4) {
      const first = wPoints[0], last = wPoints[wPoints.length - 1]
      const daysDiff = Math.max(1,
        (new Date(last.entryDate + 'T12:00:00').getTime() - new Date(first.entryDate + 'T12:00:00').getTime()) / 86400000,
      )
      const kgPerDay = ((last.weightKg ?? 0) - (first.weightKg ?? 0)) / daysDiff
      const kgToGo   = targetWeightKg - (last.weightKg ?? 0)
      if (kgToGo !== 0 && kgPerDay !== 0 && Math.sign(kgToGo) === Math.sign(kgPerDay)) {
        const daysToGoal = Math.round(kgToGo / kgPerDay)
        if (daysToGoal > 0 && daysToGoal < 365) {
          const eta = new Date()
          eta.setDate(eta.getDate() + daysToGoal)
          const etaStr = eta.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          const rateStr = `${kgPerDay > 0 ? '+' : ''}${(kgPerDay * 7).toFixed(2)} kg/wk`
          insights.push({
            id: 'goal-eta',
            icon: '🏁',
            title: 'Goal ETA',
            body: `At ${rateStr}, you reach ${targetWeightKg} kg around ${etaStr}.`,
            tone: 'info',
          })
        }
      }
    }
  }

  return insights.slice(0, 3)
}

interface CalorieSuggestion {
  status: 'too-fast' | 'stalled' | 'on-track' | 'gaining-too-fast' | 'gaining-stalled'
  kgPerWeek: number
  currentTarget: number
  suggestedTarget: number
}

function computeCalorieSuggestion(
  loggedPoints: NutritionStatisticsPoint[],
  allPoints: NutritionStatisticsPoint[],
  targetWeightKg: number | null,
): CalorieSuggestion | null {
  if (targetWeightKg == null || loggedPoints.length < 14) return null
  const wPoints = allPoints.filter(p => p.weightKg != null)
  if (wPoints.length < 4) return null

  const first = wPoints[0], last = wPoints[wPoints.length - 1]
  const daysDiff = Math.max(7,
    (new Date(last.entryDate + 'T12:00:00').getTime() - new Date(first.entryDate + 'T12:00:00').getTime()) / 86400000,
  )
  const kgPerWeek = ((last.weightKg ?? 0) - (first.weightKg ?? 0)) / daysDiff * 7
  const currentWeight = last.weightKg ?? 0

  const recentTarget = loggedPoints[loggedPoints.length - 1]?.calorieTarget
  if (!recentTarget || recentTarget <= 0) return null
  const currentTarget = Math.round(recentTarget)

  const isLossGoal = targetWeightKg < currentWeight
  const isGainGoal = targetWeightKg > currentWeight

  if (isLossGoal) {
    if (kgPerWeek < -1.0) {
      return { status: 'too-fast', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget + 300) / 50) * 50 }
    }
    if (kgPerWeek > -0.15) {
      return { status: 'stalled', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget - 200) / 50) * 50 }
    }
    return { status: 'on-track', kgPerWeek, currentTarget, suggestedTarget: currentTarget }
  }

  if (isGainGoal) {
    if (kgPerWeek > 0.5) {
      return { status: 'gaining-too-fast', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget - 200) / 50) * 50 }
    }
    if (kgPerWeek < 0.1) {
      return { status: 'gaining-stalled', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget + 200) / 50) * 50 }
    }
    return { status: 'on-track', kgPerWeek, currentTarget, suggestedTarget: currentTarget }
  }

  return null
}

const SUGGESTION_COPY: Record<CalorieSuggestion['status'], { icon: string; title: string; body: (s: CalorieSuggestion) => string; tone: string }> = {
  'too-fast': {
    icon: '⚡',
    title: 'Losing too fast',
    body: s => `You're dropping ${Math.abs(s.kgPerWeek).toFixed(2)} kg/week — safe range is 0.5–1.0 kg. Consider raising your daily target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'bad',
  },
  'stalled': {
    icon: '📉',
    title: 'Weight not moving',
    body: s => `Almost no change in weight over this period. Try lowering your daily target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'neutral',
  },
  'on-track': {
    icon: '✅',
    title: 'On track',
    body: s => `${s.kgPerWeek.toFixed(2)} kg/week — right in the optimal range. Keep your current target of ${s.currentTarget} kcal.`,
    tone: 'good',
  },
  'gaining-too-fast': {
    icon: '⚡',
    title: 'Gaining too fast',
    body: s => `+${s.kgPerWeek.toFixed(2)} kg/week may mean excess fat gain. Consider lowering your target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'bad',
  },
  'gaining-stalled': {
    icon: '📈',
    title: 'Not gaining',
    body: s => `Weight isn't increasing despite a surplus goal. Try raising your target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'neutral',
  },
}

function CalorieSuggestionCard({ suggestion }: { suggestion: CalorieSuggestion }) {
  const copy = SUGGESTION_COPY[suggestion.status]
  return (
    <section className={`panel calorie-suggestion-card calorie-suggestion-card--${copy.tone}`}>
      <p className="insights-section__label">Calorie target</p>
      <div className="calorie-suggestion-card__body">
        <span className="insight-card__icon" aria-hidden="true">{copy.icon}</span>
        <div>
          <p className="insight-card__title">{copy.title}</p>
          <p className="insight-card__body">{copy.body(suggestion)}</p>
        </div>
      </div>
    </section>
  )
}

function InsightsSection({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null
  return (
    <section className="insights-section">
      <p className="insights-section__label">Pattern insights</p>
      {insights.map(insight => (
        <div key={insight.id} className={`insight-card insight-card--${insight.tone}`}>
          <span className="insight-card__icon" aria-hidden="true">{insight.icon}</span>
          <div>
            <p className="insight-card__title">{insight.title}</p>
            <p className="insight-card__body">{insight.body}</p>
          </div>
        </div>
      ))}
    </section>
  )
}

function StatisticsTable({ points }: { points: NutritionStatisticsPoint[] }) {
  const orderedPoints = [...points].reverse()

  return (
    <section className="panel statistics-panel statistics-panel--dark">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">History</p>
          <h3>Daily values</h3>
        </div>
      </div>

      <div className="statistics-table">
        <div className="statistics-table__head statistics-table__row">
          <span>Date</span>
          <span>Weight</span>
          <span>Calories</span>
          <span>Target</span>
          <span>Balance</span>
          <span>Protein</span>
          <span>Fat</span>
          <span>Carbs</span>
          <span>Fiber</span>
        </div>
        {orderedPoints.map((point) => (
          <div className="statistics-table__row" key={point.entryDate}>
            <span>{formatExpandedDate(point.entryDate)}</span>
            <span>{point.weightKg == null ? '—' : point.weightKg.toFixed(1)}</span>
            <strong>{formatMetricValue(point.consumedCalories)}</strong>
            <span>{formatMetricValue(point.calorieTarget)}</span>
            <strong className={point.calorieBalance > 0 ? 'text-over' : 'text-under'}>{formatSigned(point.calorieBalance)}</strong>
            <span>{formatMetricValue(point.proteinGrams)}</span>
            <span>{formatMetricValue(point.fatGrams)}</span>
            <span>{formatMetricValue(point.carbsGrams)}</span>
            <span>{formatMetricValue(point.fiberGrams)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

interface StatisticsTabProps {
  refreshToken?: number
}

export function StatisticsTab({ refreshToken = 0 }: StatisticsTabProps) {
  const queryClient = useQueryClient()
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)
  const [showAllCharts, setShowAllCharts] = useState(false)

  const statsQuery = useQuery<NutritionStatisticsResponse>({
    queryKey: ['statistics', rangeDays],
    queryFn: () => fetchNutritionStatistics(rangeDays),
  })
  const data = statsQuery.data ?? null
  const loading = statsQuery.isLoading
  const error = statsQuery.error instanceof Error ? statsQuery.error.message : ''

  useEffect(() => {
    if (refreshToken > 0) {
      queryClient.invalidateQueries({ queryKey: ['statistics', rangeDays] })
    }
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const points = useMemo(() => data?.points ?? [], [data])
  const selectedTitle = rangeDays === 7 ? 'last week' : rangeDays === 30 ? 'last month' : 'last 3 months'
  const loggedPoints = useMemo(() => points.filter(p => p.consumedCalories > 0), [points])

  const avgCalorieBalance = useMemo(() => {
    if (loggedPoints.length === 0) return null
    const total = loggedPoints.reduce((sum, p) => sum + p.calorieBalance, 0)
    return Math.round(total / loggedPoints.length)
  }, [loggedPoints])

  const weightChange = useMemo(() => {
    const weightPoints = points.filter((point) => point.weightKg != null)
    if (weightPoints.length < 2) return null
    const first = weightPoints[0].weightKg
    const last = weightPoints[weightPoints.length - 1].weightKg
    if (first == null || last == null) return null
    return last - first
  }, [points])

  const onTargetDays = useMemo(() => {
    return loggedPoints.filter(p => p.calorieBalance <= 0).length
  }, [loggedPoints])

  const streak = useMemo(() => computeStreak(points), [points])
  const weightTrendline = useMemo(() => movingAvg(points), [points])
  const insights = useMemo(
    () => computeInsights(loggedPoints, points, data?.targetWeightKg ?? null, rangeDays),
    [loggedPoints, points, data, rangeDays],
  )
  const calorieSuggestion = useMemo(
    () => computeCalorieSuggestion(loggedPoints, points, data?.targetWeightKg ?? null),
    [loggedPoints, points, data],
  )

  return (
    <section className="screen-section screen-section--statistics-dark">
      <header className="screen-header screen-header--statistics-dark">
        <div>
          <p className="screen-header__eyebrow">Analytics</p>
          <h2>Nutrition trends</h2>
        </div>
        <div className="statistics-toolbar">
          <p className="screen-header__meta">Last 7, 30, or 90 days, including today.</p>
          <RangeSelector value={rangeDays} onChange={setRangeDays} />
        </div>
      </header>

      {loading ? (
        <>
          {/* Chart panel */}
          <section className="panel statistics-panel statistics-panel--dark">
            <div className="skeleton" style={{ height: '1rem', width: '40%', marginBottom: 14 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: '1rem' }} />
          </section>
          {/* Metric grid 2x2 */}
          <section className="stats-metric-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card" style={{ padding: 18 }}>
                <div className="skeleton" style={{ height: '0.75rem', width: '55%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: '1.6rem', width: '70%' }} />
              </div>
            ))}
          </section>
        </>
      ) : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}
      {!loading && !error && data && loggedPoints.length === 0 ? (
        <div className="empty-state">
          <MascotSvg mood="neutral" size={140} className="empty-state__mascot" />
          <h3 className="empty-state__title">No data yet for this period</h3>
          <p className="empty-state__hint">
            Log meals on the Today tab — once you've got a few days, charts and trends will appear here.
          </p>
        </div>
      ) : null}
      {!loading && !error && data && loggedPoints.length > 0 && loggedPoints.length < 3 ? (
        <section className="panel statistics-empty-state" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
          <p className="statistics-empty-state__hint" style={{ margin: 0 }}>Only {loggedPoints.length} day{loggedPoints.length > 1 ? 's' : ''} logged — charts will be more useful with 3+ days of data.</p>
        </section>
      ) : null}
      {!loading && !error && data && loggedPoints.length > 0 ? (
        <>
          <section className="stats-metric-grid">
            <MetricCard
              title="Avg calorie balance"
              value={avgCalorieBalance == null ? '—' : `${formatSigned(avgCalorieBalance)} kcal/day`}
              detail={`Across ${selectedTitle}`}
              tone={avgCalorieBalance == null ? 'neutral' : avgCalorieBalance <= 0 ? 'good' : 'bad'}
              emoji={avgCalorieBalance == null ? '🙂' : avgCalorieBalance <= -150 ? '🟢' : avgCalorieBalance <= 150 ? '🟡' : '🔴'}
            />
            <MetricCard
              title="Weight change"
              value={weightChange == null ? '—' : `${formatSigned(Number(weightChange.toFixed(1)))} kg`}
              detail={weightChange == null ? 'Not enough weigh-ins in this range' : `From first to last weigh-in in ${selectedTitle}`}
              tone={weightChange == null ? 'neutral' : weightChange <= 0 ? 'good' : 'bad'}
              emoji={weightChange == null ? '⚖️' : weightChange <= -0.2 ? '📉' : weightChange < 0.2 ? '➖' : '📈'}
            />
            <MetricCard
              title="On-target days"
              value={loggedPoints.length === 0 ? '—' : `${onTargetDays} / ${loggedPoints.length}`}
              detail={loggedPoints.length === 0 ? 'No logged days in this range' : 'Logged days at or under target'}
              tone={loggedPoints.length === 0 ? 'neutral' : onTargetDays / loggedPoints.length >= 0.7 ? 'good' : onTargetDays / loggedPoints.length >= 0.4 ? 'neutral' : 'bad'}
              emoji={loggedPoints.length === 0 ? '🎯' : onTargetDays / loggedPoints.length >= 0.7 ? '🎯' : onTargetDays / loggedPoints.length >= 0.4 ? '👀' : '⚠️'}
            />
            <MetricCard
              title="Streak"
              value={streak === 0 ? '—' : `${streak} day${streak === 1 ? '' : 's'}`}
              detail={streak === 0 ? 'Log today to start a streak' : streak >= 7 ? 'Keep it up!' : 'Days logged in a row'}
              tone={streak === 0 ? 'neutral' : streak >= 7 ? 'good' : 'neutral'}
              emoji={streak === 0 ? '💤' : streak >= 14 ? '🔥' : streak >= 7 ? '⚡' : '📅'}
            />
          </section>

          <InsightsSection insights={insights} />
          {calorieSuggestion && <CalorieSuggestionCard suggestion={calorieSuggestion} />}

          <LineChart
            title="Weight"
            unit="kg"
            points={points}
            valueKey="weightKg"
            colorClass="line-chart__path--weight"
            gradColor="#7b61ff"
            trendline={weightTrendline}
            goalLine={data.targetWeightKg}
          />

          <section className="panel statistics-panel statistics-panel--dark">
            <div className="statistics-panel__header">
              <div>
                <p className="screen-header__eyebrow">Metric</p>
                <h3>Calorie balance</h3>
              </div>
            </div>
            <CalorieBarChart points={points} />
          </section>

          <LineChart
            title="Calories"
            unit="kcal"
            points={points}
            valueKey="consumedCalories"
            targetKey="calorieTarget"
            colorClass="line-chart__path--calories"
            gradColor="#f08a4b"
          />
          <button
            type="button"
            className="stats-show-more-btn"
            onClick={() => setShowAllCharts(v => !v)}
          >
            {showAllCharts ? 'Show less ▲' : 'Show macros & table ▼'}
          </button>

          {showAllCharts && (
            <>
              <LineChart
                title="Protein"
                unit="g"
                points={points}
                valueKey="proteinGrams"
                colorClass="line-chart__path--protein"
                gradColor="#3a86ff"
              />
              <LineChart
                title="Fat"
                unit="g"
                points={points}
                valueKey="fatGrams"
                colorClass="line-chart__path--fat"
                gradColor="#d65a8d"
              />
              <LineChart
                title="Carbs"
                unit="g"
                points={points}
                valueKey="carbsGrams"
                colorClass="line-chart__path--carbs"
                gradColor="#f6ad55"
              />
              <LineChart
                title="Fiber"
                unit="g"
                points={points}
                valueKey="fiberGrams"
                colorClass="line-chart__path--fiber"
                gradColor="#38a169"
              />
              <StatisticsTable points={points} />
            </>
          )}
        </>
      ) : null}
    </section>
  )
}
