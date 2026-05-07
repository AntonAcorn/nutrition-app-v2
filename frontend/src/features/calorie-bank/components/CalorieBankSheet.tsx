import { useEffect, useState } from 'react'
import { useCalorieBank } from '../model/useCalorieBank'
import { describeBankAsFood } from '../model/calorieToFood'
import { RelaxDayCalendar } from './RelaxDayCalendar'
import type { CalorieBankSnapshot } from '../model/calorieBankApi'

interface CalorieBankSheetProps {
  snapshot: CalorieBankSnapshot
  date: string
  onClose: () => void
}

export function CalorieBankSheet({ snapshot: initial, date, onClose }: CalorieBankSheetProps) {
  const { snapshot } = useCalorieBank(date)
  const data = snapshot ?? initial
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="calorie-bank-sheet-backdrop" onClick={onClose}>
      <div
        className="calorie-bank-sheet"
        role="dialog"
        aria-label="Calorie bank"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="calorie-bank-sheet__close" onClick={onClose} aria-label="Close">✕</button>

        <header className="calorie-bank-sheet__header">
          <span className="calorie-bank-sheet__emoji" aria-hidden>🏦</span>
          <h2>Calorie bank</h2>
          <p>Calories saved over the past 7 days — for that Friday feast.</p>
        </header>

        <div className="calorie-bank-sheet__stats">
          <div className="calorie-bank-sheet__stat">
            <span className="calorie-bank-sheet__stat-label">In bank</span>
            <strong className="calorie-bank-sheet__stat-value">+{data.bank}</strong>
            <span className="calorie-bank-sheet__stat-unit">kcal</span>
          </div>
          {data.bankUsedToday > 0 && (
            <div className="calorie-bank-sheet__stat calorie-bank-sheet__stat--spent">
              <span className="calorie-bank-sheet__stat-label">Spent today</span>
              <strong className="calorie-bank-sheet__stat-value">−{data.bankUsedToday}</strong>
              <span className="calorie-bank-sheet__stat-unit">kcal</span>
            </div>
          )}
          {data.bankRemainingAfterToday !== data.bank && (
            <div className="calorie-bank-sheet__stat">
              <span className="calorie-bank-sheet__stat-label">Left</span>
              <strong className="calorie-bank-sheet__stat-value">{data.bankRemainingAfterToday}</strong>
              <span className="calorie-bank-sheet__stat-unit">kcal</span>
            </div>
          )}
        </div>

        {data.bank > 0 && describeBankAsFood(data.bank, date) && (
          <p className="calorie-bank-sheet__food-hint">
            ≈ {describeBankAsFood(data.bank, date)}
          </p>
        )}

        <section className="calorie-bank-sheet__relax">
          <button
            type="button"
            className="calorie-bank-sheet__relax-toggle"
            onClick={() => setShowCalendar(v => !v)}
          >
            <span className="calorie-bank-sheet__relax-emoji" aria-hidden>🎂</span>
            <div className="calorie-bank-sheet__relax-text">
              <strong>Relax day{data.isRelaxToday ? ' — today' : ''}</strong>
              <span>
                {data.relaxDaysUsedThisMonth} of {data.relaxDaysAllowedPerMonth} this month
              </span>
            </div>
            <span className={`calorie-bank-sheet__chevron${showCalendar ? ' calorie-bank-sheet__chevron--open' : ''}`}>›</span>
          </button>
          {showCalendar ? (
            <RelaxDayCalendar today={date} relaxDaysAllowedPerMonth={data.relaxDaysAllowedPerMonth} />
          ) : (
            <p className="calorie-bank-sheet__relax-note">
              On a relax day, overeating doesn't drain the bank or break your streak.
            </p>
          )}
        </section>

        <footer className="calorie-bank-sheet__footer">
          Limits: up to {data.dailyBankCap} kcal/day deposited, {data.bankMax} kcal ceiling.
          Edit in profile.
        </footer>
      </div>
    </div>
  )
}
