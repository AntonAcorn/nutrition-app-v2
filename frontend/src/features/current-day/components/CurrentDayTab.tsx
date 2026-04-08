import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import type { TodaySummary } from '../../../shared/types/nutrition'

interface CurrentDayTabProps {
  refreshToken?: number
}

export function CurrentDayTab({ refreshToken = 0 }: CurrentDayTabProps) {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setLoading(true)
      setError('')

      try {
        const nextSummary = await fetchTodaySummary()
        if (!cancelled) {
          setSummary(nextSummary)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить current day summary')
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

  return (
    <section className="screen-section">
      <header className="screen-header">
        <div>
          <p className="screen-header__eyebrow">Current day</p>
          <h2>Сегодняшняя сводка</h2>
        </div>
        <p className="screen-header__meta">Current day теперь загружается из backend.</p>
      </header>

      {loading ? <section className="panel detail-panel"><p>Загружаем summary...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? (
        <>
          <TodaySummaryBlock summary={summary} />

          <section className="panel detail-panel">
            <div className="detail-panel__row">
              <span>Daily target</span>
              <strong>{summary.dailyTargetCalories} kcal</strong>
            </div>
            <div className="detail-panel__row">
              <span>Date</span>
              <strong>{summary.dateLabel}</strong>
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}
