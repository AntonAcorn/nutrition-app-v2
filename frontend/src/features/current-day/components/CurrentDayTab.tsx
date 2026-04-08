import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import type { TodaySummary } from '../../../shared/types/nutrition'

interface CurrentDayTabProps {
  refreshToken?: number
  successMessage?: string
}

export function CurrentDayTab({ refreshToken = 0, successMessage = '' }: CurrentDayTabProps) {
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
          setError(err instanceof Error ? err.message : 'Не удалось загрузить сводку за день')
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
          <p className="screen-header__eyebrow">Текущий день</p>
          <h2>Сегодняшняя сводка</h2>
          {summary ? <p className="screen-header__meta">Дата: {summary.dateLabel}</p> : null}
        </div>
        <p className="screen-header__meta">Данные загружаются из backend и обновляются после сохранения анализа.</p>
      </header>

      {successMessage ? <section className="panel detail-panel"><p className="success-text">{successMessage}</p></section> : null}
      {loading ? <section className="panel detail-panel"><p>Загружаем сводку...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? <TodaySummaryBlock summary={summary} /> : null}
    </section>
  )
}
