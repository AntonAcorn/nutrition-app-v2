import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNutritionStatisticsRange } from '../../statistics/model/statisticsApi'
import { localDateString } from '../../statistics/model/formatters'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getMondayOfCurrentWeek(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return localDateString(monday)
}

function offsetDateStr(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return localDateString(d)
}

export function WeeklyBankCard({ refreshToken = 0 }: { refreshToken?: number }) {
  const queryClient = useQueryClient()
  const today = localDateString(new Date())
  const yesterday = offsetDateStr(new Date(), -1)
  const monday = getMondayOfCurrentWeek()

  const hasPastDays = monday < today

  const { data } = useQuery({
    queryKey: ['week-bank', monday, yesterday],
    queryFn: () => fetchNutritionStatisticsRange(monday, yesterday),
    enabled: hasPastDays,
  })

  useEffect(() => {
    if (refreshToken > 0) {
      queryClient.invalidateQueries({ queryKey: ['week-bank'] })
    }
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const points = data?.points ?? []
  const pastDates = points.map(p => p.entryDate)
  const pointMap = new Map(points.map(p => [p.entryDate, p]))
  const loggedPastPoints = points.filter(p => p.consumedCalories > 0)

  if (!hasPastDays || loggedPastPoints.length < 2) return null

  const avgBalance = Math.round(
    loggedPastPoints.reduce((sum, p) => sum + p.calorieBalance, 0) / loggedPastPoints.length,
  )

  const unloggedPastCount = pastDates.filter(
    d => d < today && !(pointMap.get(d)?.consumedCalories ?? 0 > 0),
  ).length

  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    weekDates.push(offsetDateStr(new Date(monday + 'T12:00:00'), i))
  }

  return (
    <section className="weekly-bank-card">
      <div className="weekly-bank-card__header">
        <span className="weekly-bank-card__title">This week</span>
        <span className={`weekly-bank-card__avg${avgBalance <= 0 ? ' weekly-bank-card__avg--good' : ' weekly-bank-card__avg--over'}`}>
          {avgBalance > 0 ? '+' : ''}{avgBalance} kcal/day
        </span>
      </div>

      <div className="weekly-bank-card__days">
        {weekDates.map((date, i) => {
          const point = pointMap.get(date)
          const isToday = date === today
          const isFuture = date > today
          const isLogged = (point?.consumedCalories ?? 0) > 0
          const isOver = isLogged && (point!.calorieBalance) > 50

          let mod = ''
          if (isToday) mod = 'today'
          else if (isFuture) mod = 'future'
          else if (isLogged && !isOver) mod = 'good'
          else if (isLogged && isOver) mod = 'over'
          else mod = 'unlogged'

          return (
            <div key={date} className="weekly-bank-card__day">
              <div className={`weekly-bank-card__dot weekly-bank-card__dot--${mod}`} />
              <span className="weekly-bank-card__dow">{DOW[i]}</span>
            </div>
          )
        })}
      </div>

      {unloggedPastCount > 0 && (
        <p className="weekly-bank-card__warning">
          {unloggedPastCount} day{unloggedPastCount > 1 ? 's' : ''} not logged — avg may be off
        </p>
      )}
    </section>
  )
}
