import { useEffect } from 'react'
import { SLOT_LABELS, type MealSlot } from '../model/mealLogApi'
import { hapticLight } from '../../../shared/lib/haptic'

const SLOT_TYPES: MealSlot['slotType'][] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

const SLOT_EMOJI: Record<MealSlot['slotType'], string> = {
  BREAKFAST: '🌅',
  LUNCH:     '☀️',
  DINNER:    '🌙',
  SNACK:     '🍪',
}

interface Props {
  /** Slot the system would have auto-picked from time-of-day. Highlighted as the default. */
  suggested: MealSlot['slotType']
  onPick: (slot: MealSlot['slotType']) => void
  onCancel: () => void
}

/**
 * Tiny modal shown when the user opens Add Food without specifying a slot
 * (i.e. the global FAB). Lets them confirm or override the auto-guess
 * BEFORE the QuickAdd sheet opens — so the rest of the flow has a fixed,
 * explicit slot just like a slot-row entry.
 */
export function MealSlotPickerPopup({ suggested, onPick, onCancel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function pick(slot: MealSlot['slotType']) {
    hapticLight()
    onPick(slot)
  }

  return (
    <div className="slot-picker-backdrop" onClick={onCancel}>
      <div
        className="slot-picker"
        role="dialog"
        aria-label="Choose meal"
        onClick={e => e.stopPropagation()}
      >
        <p className="slot-picker__title">Which meal?</p>
        <div className="slot-picker__grid">
          {SLOT_TYPES.map(s => (
            <button
              key={s}
              type="button"
              className={`slot-picker__btn${s === suggested ? ' slot-picker__btn--suggested' : ''}`}
              onClick={() => pick(s)}
            >
              <span className="slot-picker__emoji" aria-hidden>{SLOT_EMOJI[s]}</span>
              <span className="slot-picker__label">{SLOT_LABELS[s]}</span>
              {s === suggested && <span className="slot-picker__hint">Suggested</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
