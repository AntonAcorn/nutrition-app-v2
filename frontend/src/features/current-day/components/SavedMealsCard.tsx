import { useEffect, useState } from 'react'
import { listTemplates, logTemplate } from '../../food-library/model/mealTemplateApi'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import type { MealTemplate } from '../../../shared/types/nutrition'

interface Props {
  onLogged: () => void
}

export function SavedMealsCard({ onLogged }: Props) {
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [loggedId, setLoggedId] = useState<string | null>(null)

  useEffect(() => {
    listTemplates().then(list => setTemplates(list.slice(0, 4))).catch(() => {})
  }, [])

  if (templates.length === 0) return null

  async function handleLog(t: MealTemplate) {
    setLoggingId(t.id)
    try {
      await logTemplate(t.id, getTodayLocalDateInputValue())
      setLoggedId(t.id)
      setTimeout(() => setLoggedId(null), 1800)
      onLogged()
    } catch {
      // silent
    } finally {
      setLoggingId(null)
    }
  }

  return (
    <section className="panel saved-meals-card">
      <p className="saved-meals-card__title">Saved meals</p>
      <div className="saved-meals-list">
        {templates.map(t => (
          <div key={t.id} className="saved-meal-row">
            <div className="saved-meal-row__info">
              <p className="saved-meal-row__name">{t.name}</p>
              <p className="saved-meal-row__meta">{Math.round(t.totalCalories)} kcal</p>
            </div>
            <button
              type="button"
              className={`saved-meal-row__btn${loggedId === t.id ? ' saved-meal-row__btn--done' : ''}`}
              onClick={() => handleLog(t)}
              disabled={loggingId === t.id}
            >
              {loggedId === t.id ? '✓' : loggingId === t.id ? '…' : '+'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
