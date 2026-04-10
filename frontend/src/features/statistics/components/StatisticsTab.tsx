import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchNutritionStatistics } from '../model/statisticsApi'
import type { NutritionBalanceSummary, NutritionStatisticsPoint, NutritionStatisticsResponse } from '../../../shared/types/nutrition'

const RANGE_OPTIONS = [7, 14, 30] as const

type RangeDays = (typeof RANGE_OPTIONS)[number]

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return `${value}`
}

function formatShortDate(value: string): string {
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

function SummaryCard({ title, summary }: { title: string; summary: NutritionBalanceSummary }) {
  return (
    <section className="stats-metric-card">
      <div className="stats-metric-card__top">
        <span>{title}</span>
        <span className={`stats-metric-card__delta ${summary.calorieBalance > 0 ? 'text-over' : 'text-under'}`}>
          {formatSigned(summary.calorieBalance)} ккал
        </span>
      </div>
      <strong>{summary.consumedCalories}</strong>
      <p>из {summary.targetCalories} kcal target</p>
    </section>
  )
}

function WeightAverageCard({ title, value }: { title: string; value: number | null }) {
  return (
    <section className="stats-metric-card">
      <div className="stats-metric-card__top">
        <span>{title}</span>
      </div>
      <strong>{value == null ? '—' : value.toFixed(1)}</strong>
      <p>kg average</p>
    </section>
  )
}

function RangeSelector({ value, onChange }: { value: RangeDays; onChange: (value: RangeDays) => void }) {
  return (
    <div className="range-selector" role="tablist" aria-label="Диапазон статистики">
      {RANGE_OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          className={`range-selector__button ${value === days ? 'range-selector__button--active' : ''}`}
          onClick={() => onChange(days)}
        >
          {days} дней
        </button>
      ))}
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
            <p className="screen-header__eyebrow">Статистика</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="chart-modal__close" onClick={onClose} aria-label="Закрыть график">
            Закрыть
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
  expanded,
  onExpand,
}: {
  title: string
  unit: string
  points: NutritionStatisticsPoint[]
  valueKey: 'weightKg' | 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams'
  targetKey?: 'calorieTarget'
  colorClass: string
  expanded?: boolean
  onExpand?: () => void
}) {
  const values = points.map((point) => point[valueKey] ?? null)
  const targets = targetKey ? points.map((point) => point[targetKey] ?? null) : []
  const width = 760
  const height = 180
  const numericValues = values.filter((value): value is number => value != null)
  const numericTargets = targets.filter((value): value is number => value != null)
  const max = Math.max(1, ...numericValues, ...numericTargets)
  const min = Math.min(0, ...numericValues, ...numericTargets)
  const valuePath = buildLinePath(values, width, height, min, max)
  const targetPath = targets.length > 0 ? buildLinePath(targets, width, height, min, max) : ''
  const guideValues = [min, (min + max) / 2, max]
  const labelStep = points.length > 14 ? 4 : points.length > 7 ? 2 : 1

  const chartContent = (
    <div className={`line-chart line-chart--dark-card ${expanded ? 'line-chart--expanded' : ''}`}>
      <div className="line-chart__floating-tag">Trend</div>
      <div className="line-chart__canvas line-chart__canvas--dark">
        <div className="line-chart__axis line-chart__axis--y">
          {guideValues.slice().reverse().map((guide) => (
            <span key={`${title}-${guide}`}>{Math.round(guide)}</span>
          ))}
        </div>
        <div className="line-chart__plot">
          <div className="line-chart__grid line-chart__grid--dark">
            {guideValues.map((guide) => (
              <span key={`${title}-grid-${guide}`} />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart__svg" role="img" aria-label={title}>
            <path d={valuePath} className={`line-chart__path ${colorClass} line-chart__path--glow`} />
            {targetPath ? <path d={targetPath} className="line-chart__path line-chart__path--target" /> : null}
          </svg>
          <div className="line-chart__axis line-chart__axis--x" style={{ ['--label-count' as string]: String(points.length) }}>
            {points.map((point, index) => (
              <span key={`${title}-${point.entryDate}`} className={index % labelStep === 0 || index === points.length - 1 ? '' : 'line-chart__label--ghost'}>
                {index % labelStep === 0 || index === points.length - 1 ? formatShortDate(point.entryDate) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <section
        className={`panel statistics-panel statistics-panel--dark ${onExpand ? 'statistics-panel--interactive' : ''}`}
        onClick={onExpand}
        role={onExpand ? 'button' : undefined}
        tabIndex={onExpand ? 0 : undefined}
        onKeyDown={onExpand ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onExpand()
          }
        } : undefined}
      >
        <div className="statistics-panel__header">
          <div>
            <p className="screen-header__eyebrow">Metric</p>
            <h3>{title}</h3>
          </div>
          <div className="statistics-panel__actions">
            <div className="statistics-chip">{unit}</div>
            {onExpand ? (
              <button type="button" className="chart-expand-button" onClick={(event) => {
                event.stopPropagation()
                onExpand()
              }}>
                Expand
              </button>
            ) : null}
          </div>
        </div>

        {chartContent}
      </section>

      {expanded && onExpand ? (
        <ChartModal title={title} onClose={onExpand}>
          <div className="statistics-panel__actions statistics-panel__actions--modal">
            <p className="subtle-text">{unit}</p>
          </div>
          <p className="chart-modal__hint subtle-text">На телефоне удобнее смотреть график в развёрнутом виде.</p>
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
          <span>Дата</span>
          <span>Вес</span>
          <span>Ккал</span>
          <span>Цель</span>
          <span>Баланс</span>
          <span>Белок</span>
          <span>Жиры</span>
          <span>Клетчатка</span>
        </div>
        {orderedPoints.map((point) => (
          <div className="statistics-table__row" key={point.entryDate}>
            <span>{point.entryDate}</span>
            <span>{point.weightKg == null ? '—' : point.weightKg.toFixed(1)}</span>
            <strong>{formatMetricValue(point.consumedCalories)}</strong>
            <span>{formatMetricValue(point.calorieTarget)}</span>
            <strong className={point.calorieBalance > 0 ? 'text-over' : 'text-under'}>{formatSigned(point.calorieBalance)}</strong>
            <span>{formatMetricValue(point.proteinGrams)}</span>
            <span>{formatMetricValue(point.fatGrams)}</span>
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
  const [rangeDays, setRangeDays] = useState<RangeDays>(14)
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
          setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику')
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
  const selectedTitle = rangeDays === 30 ? 'месяц' : `${rangeDays} дней`

  return (
    <section className="screen-section screen-section--statistics-dark">
      <header className="screen-header screen-header--statistics-dark">
        <div>
          <p className="screen-header__eyebrow">Analytics</p>
          <h2>Nutrition trends</h2>
        </div>
        <div className="statistics-toolbar">
          <p className="screen-header__meta">Your weight and intake history in a darker insights view.</p>
          <RangeSelector value={rangeDays} onChange={setRangeDays} />
        </div>
      </header>

      {loading ? <section className="panel detail-panel"><p>Загружаем статистику...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}
      {!loading && !error && data ? (
        <>
          <section className="stats-metric-grid">
            <SummaryCard
              title={`Отклонение за ${selectedTitle}`}
              summary={rangeDays === 30 ? data.monthlySummary : data.selectedPeriodSummary}
            />
            <WeightAverageCard title="Средний вес за неделю" value={data.weeklyAverageWeightKg} />
            <WeightAverageCard title="Средний вес за месяц" value={data.monthlyAverageWeightKg} />
          </section>
          <LineChart
            title="Вес"
            unit="кг"
            points={points}
            valueKey="weightKg"
            colorClass="line-chart__path--weight"
            expanded={expandedChart === 'Вес'}
            onExpand={() => setExpandedChart((current) => (current === 'Вес' ? null : 'Вес'))}
          />
          <LineChart
            title="Калории"
            unit="ккал"
            points={points}
            valueKey="consumedCalories"
            targetKey="calorieTarget"
            colorClass="line-chart__path--calories"
            expanded={expandedChart === 'Калории'}
            onExpand={() => setExpandedChart((current) => (current === 'Калории' ? null : 'Калории'))}
          />
          <div className="statistics-grid">
            <LineChart
              title="Белок"
              unit="г"
              points={points}
              valueKey="proteinGrams"
              colorClass="line-chart__path--protein"
              expanded={expandedChart === 'Белок'}
              onExpand={() => setExpandedChart((current) => (current === 'Белок' ? null : 'Белок'))}
            />
            <LineChart
              title="Жиры"
              unit="г"
              points={points}
              valueKey="fatGrams"
              colorClass="line-chart__path--fat"
              expanded={expandedChart === 'Жиры'}
              onExpand={() => setExpandedChart((current) => (current === 'Жиры' ? null : 'Жиры'))}
            />
            <LineChart
              title="Клетчатка"
              unit="г"
              points={points}
              valueKey="fiberGrams"
              colorClass="line-chart__path--fiber"
              expanded={expandedChart === 'Клетчатка'}
              onExpand={() => setExpandedChart((current) => (current === 'Клетчатка' ? null : 'Клетчатка'))}
            />
          </div>
          <StatisticsTable points={points} />
        </>
      ) : null}
    </section>
  )
}
