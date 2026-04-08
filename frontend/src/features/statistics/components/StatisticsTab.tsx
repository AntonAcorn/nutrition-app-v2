import { useEffect, useMemo, useState } from 'react'
import { fetchNutritionStatistics } from '../model/statisticsApi'
import type { NutritionStatisticsPoint, NutritionStatisticsResponse } from '../../../shared/types/nutrition'

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return `${value}`
}

function MacroChart({ title, unit, values, targets, balances, accentClass }: {
  title: string
  unit: string
  values: number[]
  targets?: number[]
  balances?: number[]
  accentClass: string
}) {
  const maxValue = Math.max(1, ...values, ...(targets ?? []), ...((balances ?? []).map((value) => Math.abs(value))))

  return (
    <section className="panel statistics-panel">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">Статистика</p>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="chart-bars" aria-label={title}>
        {values.map((value, index) => (
          <div className="chart-bars__item" key={`${title}-${index}`}>
            <div className="chart-bars__track">
              <div className={`chart-bars__value ${accentClass}`} style={{ height: `${(value / maxValue) * 100}%` }} />
              {targets ? <div className="chart-bars__target" style={{ bottom: `${(targets[index] / maxValue) * 100}%` }} /> : null}
            </div>
            <span className="chart-bars__label">{value}</span>
            {balances ? <span className={`chart-bars__balance ${balances[index] > 0 ? 'chart-bars__balance--over' : 'chart-bars__balance--under'}`}>{formatSigned(balances[index])}</span> : null}
          </div>
        ))}
      </div>

      <p className="subtle-text">Единицы: {unit}</p>
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
        <div className="statistics-table__head">
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
  const [data, setData] = useState<NutritionStatisticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const nextData = await fetchNutritionStatistics()
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
  }, [])

  const points = data?.points ?? []

  const calories = useMemo(() => points.map((point) => point.consumedCalories), [points])
  const targets = useMemo(() => points.map((point) => point.calorieTarget), [points])
  const balances = useMemo(() => points.map((point) => point.calorieBalance), [points])
  const protein = useMemo(() => points.map((point) => point.proteinGrams), [points])
  const fat = useMemo(() => points.map((point) => point.fatGrams), [points])
  const fiber = useMemo(() => points.map((point) => point.fiberGrams), [points])

  return (
    <section className="screen-section">
      <header className="screen-header">
        <div>
          <p className="screen-header__eyebrow">Статистика</p>
          <h2>История питания</h2>
        </div>
        <p className="screen-header__meta">Последние 14 дней, с отклонением по калориям относительно дневной цели.</p>
      </header>

      {loading ? <section className="panel detail-panel"><p>Загружаем статистику...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}
      {!loading && !error && data ? (
        <>
          <MacroChart title="Калории" unit="ккал" values={calories} targets={targets} balances={balances} accentClass="chart-bars__value--calories" />
          <div className="statistics-grid">
            <MacroChart title="Белок" unit="г" values={protein} accentClass="chart-bars__value--protein" />
            <MacroChart title="Жиры" unit="г" values={fat} accentClass="chart-bars__value--fat" />
            <MacroChart title="Клетчатка" unit="г" values={fiber} accentClass="chart-bars__value--fiber" />
          </div>
          <StatisticsTable points={points} />
        </>
      ) : null}
    </section>
  )
}
