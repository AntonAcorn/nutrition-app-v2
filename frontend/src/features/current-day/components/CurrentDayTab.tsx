import { useEffect, useState } from 'react'
import { TodaySummaryBlock } from './TodaySummaryBlock'
import { fetchTodaySummary } from '../model/todaySummaryApi'
import { updateTodayWeight } from '../model/weightApi'
import type { TodaySummary } from '../../../shared/types/nutrition'

interface CurrentDayTabProps {
  refreshToken?: number
  successMessage?: string
  onDayUpdated?: () => void
}

export function CurrentDayTab({ refreshToken = 0, successMessage = '', onDayUpdated }: CurrentDayTabProps) {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState('')
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
          setWeightInput(nextSummary.weightKg != null ? String(nextSummary.weightKg) : '')
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

  async function handleWeightSave() {
    const normalizedWeightInput = weightInput.trim().replace(',', '.')
    const parsedWeight = Number(normalizedWeightInput)

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError('Введи корректный вес в килограммах')
      return
    }

    setSavingWeight(true)
    setError('')

    try {
      await updateTodayWeight(parsedWeight)
      const nextSummary = await fetchTodaySummary()
      setSummary(nextSummary)
      setWeightInput(nextSummary.weightKg != null ? String(nextSummary.weightKg) : '')
      onDayUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить вес')
    } finally {
      setSavingWeight(false)
    }
  }

  return (
    <section className="screen-section">
      <header className="screen-header">
        <div>
          {summary ? <p className="screen-header__meta">Дата: {summary.dateLabel}</p> : null}
        </div>
      </header>

      {successMessage ? <section className="panel detail-panel"><p className="success-text">{successMessage}</p></section> : null}
      {!loading && summary ? (
        <section className="panel detail-panel weight-panel">
          <div className="weight-panel__content">
            <div>
              <h3>Вес на сегодня</h3>
            </div>
            <div className="weight-panel__form">
              <label>
                Вес, кг
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                  placeholder="Например, 82,4"
                />
              </label>
              <button type="button" onClick={handleWeightSave} disabled={savingWeight}>
                {savingWeight ? 'Сохраняем...' : 'Сохранить вес'}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {loading ? <section className="panel detail-panel"><p>Загружаем сводку...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? <TodaySummaryBlock summary={summary} /> : null}
    </section>
  )
}
