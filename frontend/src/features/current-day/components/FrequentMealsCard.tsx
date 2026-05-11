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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('frequent-meals-collapsed') === '1' } catch { return false }
  })

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('frequent-meals-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

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
    <section className={`panel frequent-meals-card${collapsed ? ' frequent-meals-card--collapsed' : ''}`}>
      <button
        type="button"
        className="frequent-meals-card__toggle"
        onClick={toggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand frequent meals' : 'Collapse frequent meals'}
      >
        <span className="frequent-meals-card__title">You log these often</span>
        {collapsed && <span className="frequent-meals-card__count">{meals.length}</span>}
        <span className={`frequent-meals-card__chevron${collapsed ? ' frequent-meals-card__chevron--collapsed' : ''}`} aria-hidden>▾</span>
      </button>
      {!collapsed && (
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
      )}
    </section>
  )
}
