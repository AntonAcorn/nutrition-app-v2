import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRelaxDays, markRelaxDay, unmarkRelaxDay } from '../model/calorieBankApi'

interface Props {
  today: string
  relaxDaysAllowedPerMonth: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1)
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

export function RelaxDayCalendar({ today, relaxDaysAllowedPerMonth }: Props) {
  const todayDate = new Date(`${today}T12:00:00`)
  const [viewYear, setViewYear] = useState(todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth())

  const queryClient = useQueryClient()
  const monthRef = ymd(startOfMonth(viewYear, viewMonth))

  const { data: relaxDays = [] } = useQuery<string[]>({
    queryKey: ['relax-days', monthRef],
    queryFn: () => fetchRelaxDays(monthRef),
    staleTime: 30_000,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['relax-days'] })
    queryClient.invalidateQueries({ queryKey: ['calorie-bank'] })
  }

  const markMutation = useMutation({
    mutationFn: (d: string) => markRelaxDay(d),
    onSuccess: invalidate,
  })
  const unmarkMutation = useMutation({
    mutationFn: (d: string) => unmarkRelaxDay(d),
    onSuccess: invalidate,
  })

  const relaxSet = useMemo(() => new Set(relaxDays), [relaxDays])
  const usedThisMonth = relaxDays.length
  const limitReached = usedThisMonth >= relaxDaysAllowedPerMonth

  const days = daysInMonth(viewYear, viewMonth)
  const firstDow = (startOfMonth(viewYear, viewMonth).getDay() + 6) % 7

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function isPast(date: string): boolean {
    return date < today
  }

  function toggle(date: string, isRelax: boolean) {
    if (markMutation.isPending || unmarkMutation.isPending) return
    if (isRelax) unmarkMutation.mutate(date)
    else markMutation.mutate(date)
  }

  const cells: Array<{ key: string; date?: string; day?: number }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ key: `pad-${i}` })
  for (let d = 1; d <= days; d++) {
    const date = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`
    cells.push({ key: date, date, day: d })
  }

  const errorMsg =
    (markMutation.error instanceof Error && markMutation.error.message) ||
    (unmarkMutation.error instanceof Error && unmarkMutation.error.message) ||
    ''

  return (
    <div className="relax-calendar">
      <div className="relax-calendar__header">
        <button type="button" className="relax-calendar__nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
        <span className="relax-calendar__title">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" className="relax-calendar__nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
      </div>

      <div className="relax-calendar__counter">
        {usedThisMonth} of {relaxDaysAllowedPerMonth} used
      </div>

      <div className="relax-calendar__weekdays">
        {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
      </div>

      <div className="relax-calendar__grid">
        {cells.map(cell => {
          if (!cell.date) return <span key={cell.key} className="relax-calendar__cell relax-calendar__cell--pad" />
          const isRelax = relaxSet.has(cell.date)
          const past = isPast(cell.date)
          const isTodayCell = cell.date === today
          const disabled = past || (!isRelax && limitReached)
          let modifier = ''
          if (isRelax) modifier = ' relax-calendar__cell--relax'
          else if (past) modifier = ' relax-calendar__cell--past'
          else if (isTodayCell) modifier = ' relax-calendar__cell--today'
          return (
            <button
              key={cell.key}
              type="button"
              className={`relax-calendar__cell${modifier}`}
              disabled={disabled}
              onClick={() => toggle(cell.date!, isRelax)}
            >
              {cell.day}
              {isRelax && <span className="relax-calendar__dot" aria-hidden>🎂</span>}
            </button>
          )
        })}
      </div>

      {errorMsg && <p className="relax-calendar__error">{errorMsg}</p>}
    </div>
  )
}
