import { useEffect, useState } from 'react'
import { listMealLog, deleteMealLogEntry } from '../model/mealLogApi'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import type { MealLogEntry } from '../model/mealLogApi'

interface Props {
  refreshToken?: number
  onDeleted: () => void
}

export function MealsLogCard({ refreshToken = 0, onDeleted }: Props) {
  const [meals, setMeals] = useState<MealLogEntry[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    listMealLog(getTodayLocalDateInputValue()).then(setMeals).catch(() => {})
  }, [refreshToken])

  if (meals.length === 0) return null

  async function handleDelete(id: string) {
    setDeletingId(id)
    setConfirmId(null)
    setDeleteError('')
    try {
      await deleteMealLogEntry(id)
      setMeals(prev => prev.filter(m => m.id !== id))
      onDeleted()
    } catch {
      setDeleteError('Failed to delete. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="panel meals-log-card">
      <p className="meals-log-card__title">Today's meals</p>
      {deleteError ? <p className="error-text" style={{ marginBottom: '0.5rem' }}>{deleteError}</p> : null}
      <div className="meals-log-list">
        {meals.map(m => (
          <div key={m.id} className="meal-log-row">
            <div className="meal-log-row__info">
              <p className="meal-log-row__name">{m.name}</p>
              <p className="meal-log-row__meta">{Math.round(m.caloriesKcal)} kcal</p>
            </div>
            {confirmId === m.id ? (
              <div className="meal-log-row__confirm">
                <button
                  type="button"
                  className="meal-log-row__confirm-yes"
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                >
                  {deletingId === m.id ? '…' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="meal-log-row__confirm-no"
                  onClick={() => setConfirmId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="meal-log-row__delete"
                onClick={() => setConfirmId(m.id)}
                aria-label={`Delete ${m.name}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
