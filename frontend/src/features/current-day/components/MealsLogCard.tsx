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

  useEffect(() => {
    listMealLog(getTodayLocalDateInputValue()).then(setMeals).catch(() => {})
  }, [refreshToken])

  if (meals.length === 0) return null

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteMealLogEntry(id)
      setMeals(prev => prev.filter(m => m.id !== id))
      onDeleted()
    } catch {
      // silent — meal stays in list
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="panel meals-log-card">
      <p className="meals-log-card__title">Today's meals</p>
      <div className="meals-log-list">
        {meals.map(m => (
          <div key={m.id} className="meal-log-row">
            <div className="meal-log-row__info">
              <p className="meal-log-row__name">{m.name}</p>
              <p className="meal-log-row__meta">{Math.round(m.caloriesKcal)} kcal</p>
            </div>
            <button
              type="button"
              className="meal-log-row__delete"
              onClick={() => handleDelete(m.id)}
              disabled={deletingId === m.id}
              aria-label={`Delete ${m.name}`}
            >
              {deletingId === m.id ? '…' : '✕'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
