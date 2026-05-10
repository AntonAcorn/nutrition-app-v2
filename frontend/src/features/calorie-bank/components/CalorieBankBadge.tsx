import { useState } from 'react'
import type { CalorieBankSnapshot } from '../model/calorieBankApi'
import { CalorieBankSheet } from './CalorieBankSheet'

interface CalorieBankBadgeProps {
  snapshot: CalorieBankSnapshot | null
  date: string
  consumedRatio?: number
  remaining?: number
  isToday?: boolean
}

interface BadgeContent {
  emoji: string
  text: string
}

function pickBadgeContent(
  snapshot: CalorieBankSnapshot,
  consumedRatio: number,
  remaining: number,
  isToday: boolean,
): BadgeContent | null {
  if (snapshot.isRelaxToday) {
    return { emoji: '🎂', text: 'free pass today' }
  }
  if (snapshot.bankUsedToday > 0) {
    const heavy = snapshot.bankUsedToday > 200
    return {
      emoji: heavy ? '🍔' : '🍺',
      text: `−${snapshot.bankUsedToday} from bank`,
    }
  }
  // Returning user: show existing balance once committed for the day.
  if (snapshot.bank > 0 && consumedRatio >= 0.85) {
    return { emoji: '🏦', text: `+${snapshot.bank} in bank` }
  }
  // Day-1 visibility: bank is empty, show what's about to deposit so the
  // mechanic shows up immediately after the first log instead of at midnight.
  if (isToday && snapshot.bank === 0 && consumedRatio > 0 && remaining > 0) {
    const projected = Math.min(remaining, snapshot.dailyBankCap)
    if (projected > 0) {
      return { emoji: '🏦', text: `+${projected} to bank tonight` }
    }
  }
  return null
}

export function CalorieBankBadge({ snapshot, date, consumedRatio = 0, remaining = 0, isToday = false }: CalorieBankBadgeProps) {
  const [open, setOpen] = useState(false)

  if (!snapshot) return null
  const content = pickBadgeContent(snapshot, consumedRatio, remaining, isToday)
  if (!content) return null

  return (
    <>
      <button type="button" className="calorie-bank-badge" onClick={() => setOpen(true)}>
        <span className="calorie-bank-badge__emoji" aria-hidden>{content.emoji}</span>
        <span className="calorie-bank-badge__text">{content.text}</span>
      </button>
      {open && (
        <CalorieBankSheet
          snapshot={snapshot}
          date={date}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
