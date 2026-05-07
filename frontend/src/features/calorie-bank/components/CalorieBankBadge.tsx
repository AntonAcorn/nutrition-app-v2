import { useState } from 'react'
import type { CalorieBankSnapshot } from '../model/calorieBankApi'
import { CalorieBankSheet } from './CalorieBankSheet'

interface CalorieBankBadgeProps {
  snapshot: CalorieBankSnapshot | null
  date: string
  consumedRatio?: number
}

interface BadgeContent {
  emoji: string
  text: string
}

function pickBadgeContent(snapshot: CalorieBankSnapshot, consumedRatio: number): BadgeContent | null {
  if (snapshot.isRelaxToday) {
    return { emoji: '🎂', text: 'сегодня без правил' }
  }
  if (snapshot.bankUsedToday > 0) {
    const heavy = snapshot.bankUsedToday > 200
    return {
      emoji: heavy ? '🍔' : '🍺',
      text: `−${snapshot.bankUsedToday} из запаса`,
    }
  }
  if (snapshot.bank > 0 && consumedRatio >= 0.85) {
    return { emoji: '🏦', text: `+${snapshot.bank} в запасе` }
  }
  return null
}

export function CalorieBankBadge({ snapshot, date, consumedRatio = 0 }: CalorieBankBadgeProps) {
  const [open, setOpen] = useState(false)

  if (!snapshot) return null
  const content = pickBadgeContent(snapshot, consumedRatio)
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
