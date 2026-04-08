import { useEffect, useMemo, useState } from 'react'
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

function buildLinePath(values: number[], width: number, height: number, min: number, max: number) {
  if (values.length === 0) {
    return ''
  }

  const range = Math.max(1, max - min)

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function SummaryCard({ title, summary }: { title: string; summary: NutritionBalanceSummary }) {
  return (
    <section className="summary-card summary-card--stats">
      <span className="summary-card__label">{title}</span>
      <strong className={`summary-card__value ${summary.calorieBalance > 0 ? 'text-over' : 'text-under'}`}>
        {formatSigned(summary.calorieBalance)}
        <span className="summary-card__unit"> ккал</span>
      </strong>
      <p className="subtle-text">
        Съедено {summary.consumedCalories} из {summary.targetCalories}
      </p>
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

function LineChart({
  title,
  unit,
  points,
  valueKey,
  targetKey,
  colorClass,
}: {
  title: string
  unit: string
  points: NutritionStatisticsPoint[]
  valueKey: 'consumedCalories' | 'proteinGrams' | 'fatGrams' | 'fiberGrams'
  targetKey?: 'calorieTarget'
  colorClass: string
}) {
  const values = points.map((point) => point[valueKey])
  const targets = targetKey ? points.map((point) => point[targetKey]) : []
  const width = 760
  const height = 220
  const max = Math.max(1, ...values, ...targets)
  const min = Math.min(0, ...values, ...targets)
  const valuePath = buildLinePath(values, width, height, min, max)
  const targetPath = targets.length > 0 ? buildLinePath(targets, width, height, min, max) : ''
  const guideValues = [min, (min + max) / 2, max]
  const labelStep = points.length > 14 ? 4 : points.length > 7 ? 2 : 1

  return (
    <section className="panel statistics-panel">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">Статистика</p>
          <h3>{title}</h3>
        </div>
        <p className="subtle-text">{unit}</p>
      </div>

      <div className="line-chart line-chart--framed">
        <div className="line-chart__guides">
          {guideValues.slice().reverse().map((guide) => (
            <span key={`${title}-${guide}`}>{Math.round(guide)}</span>
          ))}
        </div>
        <div className="line-chart__canvas">
          <div className="line-chart__grid">
            {guideValues.map((guide) => (
              <span key={`${title}-grid-${guide}`} />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart__svg" role="img" aria-label={title}>
            <path d={valuePath} className={`line-chart__path ${colorClass}`} />
            {targetPath ? <path d={targetPath} className="line-chart__path line-chart__path--target" /> : null}
          </svg>
        </div>
        <div className="line-chart__labels" style={{ ['--label-count' as string]: String(points.length) }}>
          {points.map((point, index) => (
            <span key={`${title}-${point.entryDate}`} className={index % labelStep === 0 || index === points.length - 1 ? '' : 'line-chart__label--ghost'}>
              {index % labelStep === 0 || index === points.length - 1 ? formatShortDate(point.entryDate) : ''}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatisticsTable({ points }: { points: NutritionStatisticsPoint[] }) {
  return (
    <section className="panel statistics-panel">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">Отклонения</p>
          <h3>Дневные значения</h3>
        </div>
      </div>

      <div className="statistics-table">
        <div className="statistics-table__head statistics-table__row">
          <span>Дата</span>
          <span>Ккал</span>
          <span>Цель</span>
          <span>Баланс</span>
          <span>Белок</span>
          <span>Жиры</span>
          <span>Клетчатка</span>
        </div>
        {points.map((point) => (
          <div className="statistics-table__row" key={point.entryDate}>
            <span>{point.entryDate}</span>
            <strong>{point.consumedCalories}</strong>
            <span>{point.calorieTarget}</span>
            <strong className={point.calorieBalance > 0 ? 'text-over' : 'text-under'}>{formatSigned(point.calorieBalance)}</strong>
            <span>{point.proteinGrams}</span>
            <span>{point.fatGrams}</span>
            <span>{point.fiberGrams}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function StatisticsTab() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(14)
  const [data, setData] = useState<NutritionStatisticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  }, [rangeDays])

  const points = useMemo(() => data?.points ?? [], [data])

  return (
    <section className="screen-section">
      <header className="screen-header">
        <div>
          <p className="screen-header__eyebrow">Статистика</p>
          <h2>История питания</h2>
        </div>
        <div className="statistics-toolbar">
          <p className="screen-header__meta">Дневные, недельные и месячные отклонения.</p>
          <RangeSelector value={rangeDays} onChange={setRangeDays} />
        </div>
      </header>

      {loading ? <section className="panel detail-panel"><p>Загружаем статистику...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}
      {!loading && !error && data ? (
        <>
          <section className="current-day-grid">
            <SummaryCard title="Отклонение за неделю" summary={data.weeklySummary} />
            <SummaryCard title="Отклонение за месяц" summary={data.monthlySummary} />
          </section>
          <LineChart title="Калории" unit="ккал" points={points} valueKey="consumedCalories" targetKey="calorieTarget" colorClass="line-chart__path--calories" />
          <div className="statistics-grid">
            <LineChart title="Белок" unit="г" points={points} valueKey="proteinGrams" colorClass="line-chart__path--protein" />
            <LineChart title="Жиры" unit="г" points={points} valueKey="fatGrams" colorClass="line-chart__path--fat" />
            <LineChart title="Клетчатка" unit="г" points={points} valueKey="fiberGrams" colorClass="line-chart__path--fiber" />
          </div>
          <StatisticsTable points={points} />
        </>
      ) : null}
    </section>
  )
}
