import { useEffect, useState } from 'react'
import { listFrequentMeals, type FrequentMeal } from '../model/frequentMealsApi'
import { addMealManually } from '../model/nutritionTotalsApi'
import { defaultSlotByTime } from '../model/mealLogApi'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'

interface Props {
  onLogged: () => void
}

export function FrequentMealsCard({ onLogged }: Props) {
  const [meals, setMeals] = useState<FrequentMeal[]>([])
  const [loggingName, setLoggingName] = useState<string | null>(null)
  const [loggedName, setLoggedName] = useState<string | null>(null)

  useEffect(() => {
    listFrequentMeals(7, 5).then(setMeals).catch(() => {})
  }, [])

  if (meals.length === 0) return null

  async function handleLog(m: FrequentMeal) {
    setLoggingName(m.name)
    try {
      await addMealManually(
        {
          caloriesConsumedKcal: m.caloriesKcal,
          proteinGrams: m.proteinG,
          fatGrams: m.fatG,
          carbsGrams: m.carbsG,
          fiberGrams: m.fiberG,
          mealName: m.name,
          slotType: defaultSlotByTime(),
        },
        getTodayLocalDateInputValue(),
      )
      setLoggedName(m.name)
      setTimeout(() => setLoggedName(null), 1800)
      onLogged()
    } catch {
      // silent
    } finally {
      setLoggingName(null)
    }
  }

  return (
    <section className="panel frequent-meals-card">
      <p className="frequent-meals-card__title">You log these often</p>
      <div className="frequent-meals-list">
        {meals.map((m) => {
          const isLogging = loggingName === m.name
          const isLogged = loggedName === m.name
          return (
            <button
              key={m.name}
              type="button"
              className={`frequent-meal-chip${isLogged ? ' frequent-meal-chip--done' : ''}`}
              onClick={() => handleLog(m)}
              disabled={isLogging}
              title={`${m.logCount}× in the last 7 days`}
            >
              <span className="frequent-meal-chip__name">{m.name}</span>
              <span className="frequent-meal-chip__meta">
                {Math.round(m.caloriesKcal)} kcal · {m.logCount}×
              </span>
              <span className="frequent-meal-chip__action">
                {isLogged ? '✓' : isLogging ? '…' : '+'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
