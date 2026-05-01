import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchNutritionStatistics } from '../model/statisticsApi'
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

function formatMetricValue(value: number | null | undefined, digits = 2): string {
  if (value == null) {
    return '—'
  }
  return value.toFixed(digits)
}

function computeStreak(points: NutritionStatisticsPoint[]): number {
  const sorted = [...points].sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  const logged = sorted.filter(p => p.consumedCalories > 0)
  if (logged.length === 0) return 0
  const last = logged[logged.length - 1]
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (last.entryDate !== today && last.entryDate !== yesterday) return 0
  let streak = 0
  let expected = last.entryDate
  for (let i = logged.length - 1; i >= 0; i--) {
    if (logged[i].entryDate === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().split('T')[0]
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
}: {
  values: Array<number | null>
  targets: Array<number | null>
  trendline?: Array<number | null>
  valueKey: 'weightKg' | 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams' | 'carbsGrams'
}) {
  const numericValues = values.filter((value): value is number => value != null)
  const numericTargets = targets.filter((value): value is number => value != null)
  const numericTrend = (trendline ?? []).filter((v): v is number => v != null)

  if (numericValues.length === 0 && numericTargets.length === 0) {
    return { min: 0, max: 1 }
  }

  if (valueKey === 'weightKg' && numericValues.length > 0) {
    const allW = [...numericValues, ...numericTrend]
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
  const W = 760, H = 140
  const midY = H / 2
  const maxAbs = Math.max(200, ...points.map(p => Math.abs(p.calorieBalance)))
  const gap = W / Math.max(points.length, 1)
  const barW = Math.max(2, gap * 0.65)

  return (
    <div className="line-chart line-chart--dark-card">
      <div className="line-chart__canvas line-chart__canvas--dark">
        <div className="line-chart__plot">
          <svg viewBox={`0 0 ${W} ${H}`} className="line-chart__svg" role="img" aria-label="Calorie balance">
            <line x1="0" y1={midY} x2={W} y2={midY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
            {points.map((p, i) => {
              const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
              const barH = Math.max(1, (Math.abs(p.calorieBalance) / maxAbs) * (midY - 6))
              const isOver = p.calorieBalance >= 0
              return (
                <rect
                  key={p.entryDate}
                  x={x - barW / 2}
                  y={isOver ? midY - barH : midY}
                  width={barW}
                  height={barH}
                  className={isOver ? 'calorie-bar--over' : 'calorie-bar--under'}
                  rx="2"
                />
              )
            })}
          </svg>
          <div className="line-chart__axis line-chart__axis--x" style={{ ['--label-count' as string]: String(points.length) }}>
            {points.map((point, index) => {
              const show = index === 0 || index === Math.floor((points.length - 1) / 2) || index === points.length - 1
              return (
                <span key={point.entryDate} className={show ? '' : 'line-chart__label--ghost'}>
                  {show ? formatShortDate(point.entryDate) : ''}
                </span>
              )
            })}
          </div>
        </div>
      </div>
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
  trendline,
  expanded,
  onExpand,
}: {
  title: string
  unit: string
  points: NutritionStatisticsPoint[]
  valueKey: 'weightKg' | 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams' | 'carbsGrams'
  targetKey?: 'calorieTarget'
  colorClass: string
  trendline?: Array<number | null>
  expanded?: boolean
  onExpand?: () => void
}) {
  const values = points.map((point) => point[valueKey] ?? null)
  const targets = targetKey ? points.map((point) => point[targetKey] ?? null) : []
  const width = 760
  const height = 180
  const { min, max } = getChartBounds({ values, targets, trendline, valueKey })
  const valuePath = buildLinePath(values, width, height, min, max)
  const targetPath = targets.length > 0 ? buildLinePath(targets, width, height, min, max) : ''
  const trendlinePath = trendline ? buildLinePath(trendline, width, height, min, max) : ''
  const guideValues = [min, (min + max) / 2, max]
  const compactLabelIndexes = new Set<number>([
    0,
    points.length > 2 ? Math.floor((points.length - 1) / 2) : 0,
    Math.max(0, points.length - 1),
  ])
  const expandedLabelStep = points.length > 14 ? 4 : points.length > 7 ? 2 : 1

  const chartContent = (
    <div className={`line-chart line-chart--dark-card ${expanded ? 'line-chart--expanded' : ''}`}>
      <div className="line-chart__canvas line-chart__canvas--dark">
        <div className="line-chart__axis line-chart__axis--y">
          {guideValues.slice().reverse().map((guide) => (
            <span key={`${title}-${guide}`}>{Math.round(guide)}</span>
          ))}
        </div>
        <div className="line-chart__plot">
          <div className={`line-chart__grid line-chart__grid--dark ${valueKey === 'weightKg' ? 'line-chart__grid--hidden' : ''}`}>
            {guideValues.map((guide) => (
              <span key={`${title}-grid-${guide}`} />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart__svg" role="img" aria-label={title}>
            <path d={valuePath} className={`line-chart__path ${colorClass} line-chart__path--glow`} />
            {targetPath ? <path d={targetPath} className="line-chart__path line-chart__path--target" /> : null}
            {trendlinePath ? <path d={trendlinePath} className="line-chart__path line-chart__path--trendline" /> : null}
          </svg>
          <div className="line-chart__axis line-chart__axis--x" style={{ ['--label-count' as string]: String(points.length) }}>
            {points.map((point, index) => {
              const visible = expanded ? (index % expandedLabelStep === 0 || index === points.length - 1) : compactLabelIndexes.has(index)
              return (
                <span
                  key={`${title}-${point.entryDate}`}
                  className={visible ? '' : 'line-chart__label--ghost'}
                >
                  {visible ? (expanded ? formatExpandedDate(point.entryDate) : formatShortDate(point.entryDate)) : ''}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <section
        className={`panel statistics-panel statistics-panel--dark ${onExpand ? 'statistics-panel--interactive' : ''}`}
      >
        <div className="statistics-panel__header">
          <div>
            <p className="screen-header__eyebrow">Metric</p>
            <h3>{title}</h3>
          </div>
          {onExpand ? (
            <button
              type="button"
              className="chart-expand-button"
              onClick={(event) => {
                event.stopPropagation()
                onExpand()
              }}
              aria-label={`Expand ${title} chart`}
              title={`Expand ${title} chart`}
            >
              ⤢
            </button>
          ) : null}
        </div>

        {chartContent}
      </section>

      {expanded && onExpand ? (
        <ChartModal title={title} onClose={onExpand}>
          <div className="statistics-panel__actions statistics-panel__actions--modal">
            <p className="subtle-text">{unit}</p>
          </div>
          {chartContent}
        </ChartModal>
      ) : null}
    </>
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
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)
  const [data, setData] = useState<NutritionStatisticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedChart, setExpandedChart] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const nextData = await fetchNutritionStatistics(rangeDays)
        if (!cancelled) {
          setData(nextData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load statistics')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [rangeDays, refreshToken])

  const points = useMemo(() => data?.points ?? [], [data])
  const selectedTitle = rangeDays === 7 ? 'last week' : rangeDays === 30 ? 'last month' : 'last 3 months'

  const avgCalorieBalance = useMemo(() => {
    if (points.length === 0) return null
    const total = points.reduce((sum, point) => sum + point.calorieBalance, 0)
    return Math.round(total / points.length)
  }, [points])

  const weightChange = useMemo(() => {
    const weightPoints = points.filter((point) => point.weightKg != null)
    if (weightPoints.length < 2) return null
    const first = weightPoints[0].weightKg
    const last = weightPoints[weightPoints.length - 1].weightKg
    if (first == null || last == null) return null
    return last - first
  }, [points])

  const onTargetDays = useMemo(() => {
    if (points.length === 0) return 0
    return points.filter((point) => point.calorieBalance <= 0).length
  }, [points])

  const streak = useMemo(() => computeStreak(points), [points])
  const weightTrendline = useMemo(() => movingAvg(points), [points])

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

      {loading ? <section className="panel detail-panel"><p>Loading statistics...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}
      {!loading && !error && data ? (
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
              value={`${onTargetDays} / ${points.length}`}
              detail="Days at or under calorie target"
              tone={points.length === 0 ? 'neutral' : onTargetDays / points.length >= 0.7 ? 'good' : onTargetDays / points.length >= 0.4 ? 'neutral' : 'bad'}
              emoji={points.length === 0 ? '🎯' : onTargetDays / points.length >= 0.7 ? '🎯' : onTargetDays / points.length >= 0.4 ? '👀' : '⚠️'}
            />
            <MetricCard
              title="Streak"
              value={streak === 0 ? '—' : `${streak} day${streak === 1 ? '' : 's'}`}
              detail={streak === 0 ? 'Log today to start a streak' : streak >= 7 ? 'Keep it up!' : 'Days logged in a row'}
              tone={streak === 0 ? 'neutral' : streak >= 7 ? 'good' : 'neutral'}
              emoji={streak === 0 ? '💤' : streak >= 14 ? '🔥' : streak >= 7 ? '⚡' : '📅'}
            />
          </section>

          {(data.weeklySummary || data.monthlySummary) && (
            <section className="stats-period-row panel">
              {data.weeklySummary && (
                <div className="stats-period-card">
                  <p className="stats-period-card__label">7-day avg</p>
                  <p className="stats-period-card__value">{Math.round(data.weeklySummary.consumedCalories / 7)}</p>
                  <p className="stats-period-card__unit">kcal / day</p>
                  <p className={`stats-period-card__balance ${data.weeklySummary.calorieBalance <= 0 ? 'stats-period-card__balance--good' : 'stats-period-card__balance--bad'}`}>
                    {formatSigned(Math.round(data.weeklySummary.calorieBalance / 7))} vs target
                  </p>
                </div>
              )}
              {data.monthlySummary && (
                <div className="stats-period-card">
                  <p className="stats-period-card__label">30-day avg</p>
                  <p className="stats-period-card__value">{Math.round(data.monthlySummary.consumedCalories / 30)}</p>
                  <p className="stats-period-card__unit">kcal / day</p>
                  <p className={`stats-period-card__balance ${data.monthlySummary.calorieBalance <= 0 ? 'stats-period-card__balance--good' : 'stats-period-card__balance--bad'}`}>
                    {formatSigned(Math.round(data.monthlySummary.calorieBalance / 30))} vs target
                  </p>
                </div>
              )}
            </section>
          )}

          <LineChart
            title="Weight"
            unit="kg"
            points={points}
            valueKey="weightKg"
            colorClass="line-chart__path--weight"
            trendline={weightTrendline}
            expanded={expandedChart === 'Weight'}
            onExpand={() => setExpandedChart((current) => (current === 'Weight' ? null : 'Weight'))}
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
            expanded={expandedChart === 'Calories'}
            onExpand={() => setExpandedChart((current) => (current === 'Calories' ? null : 'Calories'))}
          />
          <div className="statistics-grid">
            <LineChart
              title="Protein"
              unit="g"
              points={points}
              valueKey="proteinGrams"
              colorClass="line-chart__path--protein"
              expanded={expandedChart === 'Protein'}
              onExpand={() => setExpandedChart((current) => (current === 'Protein' ? null : 'Protein'))}
            />
            <LineChart
              title="Fat"
              unit="g"
              points={points}
              valueKey="fatGrams"
              colorClass="line-chart__path--fat"
              expanded={expandedChart === 'Fat'}
              onExpand={() => setExpandedChart((current) => (current === 'Fat' ? null : 'Fat'))}
            />
            <LineChart
              title="Carbs"
              unit="g"
              points={points}
              valueKey="carbsGrams"
              colorClass="line-chart__path--carbs"
              expanded={expandedChart === 'Carbs'}
              onExpand={() => setExpandedChart((current) => (current === 'Carbs' ? null : 'Carbs'))}
            />
            <LineChart
              title="Fiber"
              unit="g"
              points={points}
              valueKey="fiberGrams"
              colorClass="line-chart__path--fiber"
              expanded={expandedChart === 'Fiber'}
              onExpand={() => setExpandedChart((current) => (current === 'Fiber' ? null : 'Fiber'))}
            />
          </div>
          <StatisticsTable points={points} />
        </>
      ) : null}
    </section>
  )
}
