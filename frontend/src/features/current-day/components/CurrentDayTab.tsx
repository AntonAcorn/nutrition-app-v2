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
    <section className="screen-section screen-section--today">
      <header className="screen-header screen-header--today">
        <div>
          <p className="screen-header__eyebrow">Daily nutrition</p>
          <h2>Your day, at a glance</h2>
          {summary ? <p className="screen-header__meta">{summary.dateLabel}</p> : null}
        </div>
      </header>

      {successMessage ? <section className="panel detail-panel"><p className="success-text">{successMessage}</p></section> : null}
      {loading ? <section className="panel detail-panel"><p>Loading today summary...</p></section> : null}
      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && summary ? <TodaySummaryBlock summary={summary} /> : null}

      {!loading && summary ? (
        <section className="weight-card panel">
          <div className="weight-card__copy">
            <p className="weight-card__eyebrow">Weight check-in</p>
            <h3>{summary.weightKg == null ? 'Log your weight for today' : `${summary.weightKg.toFixed(1)} kg today`}</h3>
            <p className="subtle-text">Keep the trend accurate for your weekly and monthly charts.</p>
          </div>

          <div className="weight-card__form weight-panel__form">
            <label>
              Weight, kg
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
                placeholder="82.4"
              />
            </label>
            <button type="button" onClick={handleWeightSave} disabled={savingWeight}>
              {savingWeight ? 'Saving...' : 'Save weight'}
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
