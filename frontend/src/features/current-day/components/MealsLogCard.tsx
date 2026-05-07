import { useEffect, useRef, useState, type ReactNode } from 'react'
import { listMealLog, deleteMealLogEntry, updateMealLogEntry, SLOT_LABELS } from '../model/mealLogApi'
import type { MealSlot, MealLogEntry } from '../model/mealLogApi'
import { hapticLight, hapticMedium } from '../../../shared/lib/haptic'

const SLOT_ORDER: MealSlot['slotType'][] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

const SLOT_ICONS: Record<MealSlot['slotType'], string> = {
  BREAKFAST: '🌅',
  LUNCH: '☀️',
  DINNER: '🌙',
  SNACK: '⚡',
}

const SWIPE_DELETE_THRESHOLD = 76

function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: ReactNode }) {
  const [offset, setOffsetState] = useState(0)
  const offsetRef = useRef(0)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const startOffsetRef = useRef(0)
  const draggingRef = useRef(false)

  function setOffset(v: number) {
    offsetRef.current = v
    setOffsetState(v)
  }

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    startOffsetRef.current = offsetRef.current
    draggingRef.current = false
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = startXRef.current - e.touches[0].clientX
    const dy = Math.abs(e.touches[0].clientY - startYRef.current)
    if (!draggingRef.current) {
      if (dy > 8) return
      if (Math.abs(dx) > 4) draggingRef.current = true
      else return
    }
    setOffset(Math.max(0, Math.min(SWIPE_DELETE_THRESHOLD * 1.5, startOffsetRef.current + dx)))
  }

  function onTouchEnd() {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (offsetRef.current >= SWIPE_DELETE_THRESHOLD) {
      setOffsetState(window.innerWidth)
      onDelete()
    } else {
      setOffset(0)
    }
  }

  return (
    <div className="swipeable-row" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="swipeable-row__delete-bg" style={{ opacity: Math.min(1, offset / SWIPE_DELETE_THRESHOLD) }}>
        <span className="swipeable-row__delete-icon">🗑</span>
      </div>
      <div
        className="swipeable-row__content"
        style={{ transform: `translateX(-${offset}px)`, transition: draggingRef.current ? 'none' : 'transform 0.22s ease' }}
      >
        {children}
      </div>
    </div>
  )
}

function makeEmptySlot(slotType: MealSlot['slotType'], idx: number): MealSlot {
  return { slotId: `empty-${slotType}`, slotType, sortOrder: idx, items: [] }
}

function mergeWithDefaults(fetched: MealSlot[]): MealSlot[] {
  return SLOT_ORDER.map((type, idx) => fetched.find(s => s.slotType === type) ?? makeEmptySlot(type, idx))
}

function slotTotalKcal(slot: MealSlot): number {
  return Math.round(slot.items.reduce((sum, i) => sum + i.caloriesKcal, 0))
}

interface EditForm {
  name: string
  caloriesKcal: string
  proteinG: string
  fatG: string
  carbsG: string
  fiberG: string
}

function toEditForm(m: MealLogEntry): EditForm {
  return {
    name: m.name,
    caloriesKcal: String(Math.round(m.caloriesKcal)),
    proteinG: String(m.proteinG),
    fatG: String(m.fatG),
    carbsG: String(m.carbsG),
    fiberG: String(m.fiberG),
  }
}

interface Props {
  date: string
  refreshToken?: number
  onAddToSlot: (slotType: string) => void
  onDeleted: () => void
  onUpdated?: () => void
  onCopyFromYesterday?: () => Promise<void>
}

function slotsWithItems(slots: MealSlot[]): Set<MealSlot['slotType']> {
  return new Set(slots.filter(s => s.items.length > 0).map(s => s.slotType))
}

export function MealsLogCard({ date, refreshToken = 0, onAddToSlot, onDeleted, onUpdated, onCopyFromYesterday }: Props) {
  const [slots, setSlots] = useState<MealSlot[]>(SLOT_ORDER.map(makeEmptySlot))
  const [showSlots, setShowSlots] = useState(true)
  const [expandedSlots, setExpandedSlots] = useState<Set<MealSlot['slotType']>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editError, setEditError] = useState('')
  const [moveError, setMoveError] = useState('')
  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState('')

  // Drag-and-drop
  const [isDragging, setIsDragging] = useState(false)
  const [dropTarget, setDropTarget] = useState<MealSlot['slotType'] | null>(null)
  const dragRef = useRef<{ id: string; fromSlot: MealSlot['slotType'] } | null>(null)
  const dropTargetRef = useRef<MealSlot['slotType'] | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const ghostLabelRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    listMealLog(date)
      .then(data => {
        const merged = mergeWithDefaults(data)
        setSlots(merged)
        setExpandedSlots(slotsWithItems(merged))
      })
      .catch(() => {})
  }, [date, refreshToken])

  function toggleSlot(slotType: MealSlot['slotType']) {
    setExpandedSlots(prev => {
      const next = new Set(prev)
      if (next.has(slotType)) next.delete(slotType)
      else next.add(slotType)
      return next
    })
  }

  function openEdit(m: MealLogEntry) {
    setEditingId(m.id)
    setEditForm(toEditForm(m))
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
    setEditError('')
  }

  async function saveEdit(id: string) {
    if (!editForm) return
    if (!editForm.name.trim()) { setEditError('Name is required'); return }
    const cal = parseFloat(editForm.caloriesKcal)
    if (!Number.isFinite(cal) || cal < 0) { setEditError('Enter valid calories'); return }
    setSavingId(id)
    setEditError('')
    try {
      const updated = await updateMealLogEntry(id, {
        name: editForm.name.trim(),
        caloriesKcal: cal,
        proteinG: parseFloat(editForm.proteinG) || 0,
        fatG: parseFloat(editForm.fatG) || 0,
        carbsG: parseFloat(editForm.carbsG) || 0,
        fiberG: parseFloat(editForm.fiberG) || 0,
      })
      setSlots(prev => prev.map(slot => ({
        ...slot,
        items: slot.items.map(m => m.id === id ? updated : m),
      })))
      setEditingId(null)
      setEditForm(null)
      onUpdated?.()
    } catch {
      setEditError('Failed to save. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError('')
    try {
      await deleteMealLogEntry(id)
      setSlots(prev => {
        const updated = mergeWithDefaults(
          prev
            .map(slot => ({ ...slot, items: slot.items.filter(m => m.id !== id) }))
            .filter(slot => slot.items.length > 0)
        )
        setExpandedSlots(slotsWithItems(updated))
        return updated
      })
      onDeleted()
    } catch {
      setDeleteError('Failed to delete. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleMove(id: string, targetSlot: MealSlot['slotType']) {
    setMoveError('')
    try {
      await updateMealLogEntry(id, { slotType: targetSlot })
      const data = await listMealLog(date)
      const merged = mergeWithDefaults(data)
      setSlots(merged)
      setExpandedSlots(slotsWithItems(merged))
      onUpdated?.()
    } catch {
      setMoveError('Failed to move. Please try again.')
    }
  }

  function findDropSlot(x: number, y: number): MealSlot['slotType'] | null {
    const els = document.elementsFromPoint(x, y)
    for (const el of els) {
      const slot = (el as HTMLElement).dataset.dropSlot
      if (slot) return slot as MealSlot['slotType']
    }
    return null
  }

  function onDragHandleTouch(e: React.TouchEvent, item: MealLogEntry, fromSlot: MealSlot['slotType']) {
    e.stopPropagation()
    const touch = e.touches[0]

    dragRef.current = { id: item.id, fromSlot }
    dropTargetRef.current = null

    if (ghostLabelRef.current) ghostLabelRef.current.textContent = item.name
    if (ghostRef.current) {
      ghostRef.current.style.left = `${touch.clientX}px`
      ghostRef.current.style.top = `${touch.clientY}px`
      ghostRef.current.style.display = 'flex'
    }

    setIsDragging(true)
    setDropTarget(null)
    hapticMedium()

    function onMove(ev: TouchEvent) {
      if (!dragRef.current) return
      ev.preventDefault()
      const t = ev.touches[0]
      if (ghostRef.current) {
        ghostRef.current.style.left = `${t.clientX}px`
        ghostRef.current.style.top = `${t.clientY}px`
      }
      const slot = findDropSlot(t.clientX, t.clientY)
      if (slot !== dropTargetRef.current) {
        dropTargetRef.current = slot
        setDropTarget(slot)
        if (slot && slot !== dragRef.current.fromSlot) hapticLight()
      }
    }

    function onEnd() {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)

      if (ghostRef.current) ghostRef.current.style.display = 'none'

      const target = dropTargetRef.current
      const drag = dragRef.current

      dragRef.current = null
      dropTargetRef.current = null
      setIsDragging(false)
      setDropTarget(null)

      if (drag && target && target !== drag.fromSlot) {
        handleMove(drag.id, target)
      }
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
  }

  const totalKcal = slots.reduce((sum, slot) => sum + slotTotalKcal(slot), 0)

  const SLOT_COLORS: Record<MealSlot['slotType'], string> = {
    BREAKFAST: '#fb923c',
    LUNCH:     '#fbbf24',
    DINNER:    '#a78bfa',
    SNACK:     '#2dd4bf',
  }

  return (
    <section className="panel meals-log-card">
      {/* Drag ghost */}
      <div ref={ghostRef} className="drag-ghost" style={{ display: 'none' }}>
        <span className="drag-ghost__icon">≡</span>
        <span ref={ghostLabelRef} className="drag-ghost__label" />
      </div>

      <div className="meals-log-card__header">
        <p className="meals-log-card__title">Today's meals</p>
        <button
          type="button"
          className="today-card-details-toggle"
          onClick={() => setShowSlots(v => !v)}
        >
          {showSlots ? 'Hide ▴' : `${totalKcal > 0 ? `${totalKcal} kcal · ` : ''}Show ▾`}
        </button>
      </div>
      {totalKcal > 0 && (
        <>
          <div className="meals-breakdown-bar">
            {SLOT_ORDER.map(slotType => {
              const slot = slots.find(s => s.slotType === slotType)
              const kcal = slot ? slotTotalKcal(slot) : 0
              const pct = (kcal / totalKcal) * 100
              return pct > 0 ? (
                <div
                  key={slotType}
                  className="meals-breakdown-bar__segment"
                  style={{ width: `${pct}%`, background: SLOT_COLORS[slotType] }}
                />
              ) : null
            })}
          </div>
          <div className="meals-breakdown-legend">
            {SLOT_ORDER.map(slotType => {
              const slot = slots.find(s => s.slotType === slotType)
              const kcal = slot ? slotTotalKcal(slot) : 0
              return kcal > 0 ? (
                <span key={slotType} className="meals-breakdown-legend__item">
                  <span className="meals-breakdown-legend__dot" style={{ background: SLOT_COLORS[slotType] }} />
                  <span className="meals-breakdown-legend__icon">{SLOT_ICONS[slotType]}</span>
                  <span className="meals-breakdown-legend__label">{SLOT_LABELS[slotType]}</span>
                  <span className="meals-breakdown-legend__kcal">{kcal}</span>
                </span>
              ) : null
            })}
          </div>
        </>
      )}

      {totalKcal === 0 && onCopyFromYesterday && (
        <div className="copy-yesterday-row">
          <button
            type="button"
            className="copy-yesterday-btn"
            disabled={copying}
            onClick={async () => {
              setCopying(true)
              setCopyError('')
              try { await onCopyFromYesterday() }
              catch { setCopyError('Nothing to copy or an error occurred') }
              finally { setCopying(false) }
            }}
          >
            {copying ? 'Copying…' : '↩ Copy from yesterday'}
          </button>
          {copyError && <p className="error-text" style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>{copyError}</p>}
        </div>
      )}

      {deleteError ? <p className="error-text" style={{ marginBottom: '0.5rem' }}>{deleteError}</p> : null}
      {moveError ? <p className="error-text" style={{ marginBottom: '0.5rem' }}>{moveError}</p> : null}

      {showSlots && slots.map((slot, idx) => {
        const kcal = slotTotalKcal(slot)
        const isLast = idx === slots.length - 1
        const isExpanded = expandedSlots.has(slot.slotType)
        const isDropTarget = isDragging && dropTarget === slot.slotType && dragRef.current?.fromSlot !== slot.slotType
        return (
          <div key={slot.slotType} className={`meals-log-slot${isLast ? ' meals-log-slot--last' : ''}`}>
            <div
              className={`meals-log-slot__header${isDropTarget ? ' meals-log-slot__header--drop-target' : ''}`}
              data-drop-slot={slot.slotType}
            >
              <button
                type="button"
                className="meals-log-slot__toggle-area"
                onClick={() => toggleSlot(slot.slotType)}
                aria-expanded={isExpanded}
                data-drop-slot={slot.slotType}
              >
                <span className="meals-log-slot__icon" data-drop-slot={slot.slotType}>{SLOT_ICONS[slot.slotType]}</span>
                <span className="meals-log-slot__name" data-drop-slot={slot.slotType}>{SLOT_LABELS[slot.slotType]}</span>
                <span className="meals-log-slot__kcal" data-drop-slot={slot.slotType}>{kcal > 0 ? `${kcal} kcal` : ''}</span>
                <span className="meals-log-slot__chevron" data-drop-slot={slot.slotType}>{isExpanded ? '▾' : '▸'}</span>
              </button>
              <button
                type="button"
                className="meals-log-slot__add"
                onClick={() => onAddToSlot(slot.slotType)}
                aria-label={`Add to ${SLOT_LABELS[slot.slotType]}`}
              >
                +
              </button>
            </div>

            {isExpanded && slot.items.length > 0 && (
              <div className="meals-log-list">
                {slot.items.map(m => {
                  const isEditing = editingId === m.id

                  if (isEditing && editForm) {
                    return (
                      <div key={m.id} className="meal-log-row meal-log-row--editing">
                        <div className="meal-log-edit-form">
                          <input
                            className="meal-log-edit-name"
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)}
                            placeholder="Meal name"
                          />
                          <div className="meal-log-edit-macros">
                            {([
                              { key: 'caloriesKcal', label: 'Kcal' },
                              { key: 'proteinG',     label: 'P, g' },
                              { key: 'fatG',         label: 'F, g' },
                              { key: 'carbsG',       label: 'C, g' },
                              { key: 'fiberG',       label: 'Fi, g' },
                            ] as const).map(({ key, label }) => (
                              <label key={key} className="meal-log-edit-macro">
                                <span>{label}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editForm[key]}
                                  onChange={e => setEditForm(f => f ? { ...f, [key]: e.target.value } : f)}
                                />
                              </label>
                            ))}
                          </div>
                          {editError && <p className="error-text" style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>{editError}</p>}
                          <div className="meal-log-edit-actions">
                            <button
                              type="button"
                              className="meal-log-edit-save"
                              onClick={() => saveEdit(m.id)}
                              disabled={savingId === m.id}
                            >
                              {savingId === m.id ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" className="meal-log-edit-cancel" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <SwipeableRow key={m.id} onDelete={() => handleDelete(m.id)}>
                      <div className="meal-log-row">
                        <div className="meal-log-row__info">
                          <p className="meal-log-row__name">{m.name}</p>
                          <p className="meal-log-row__meta">{Math.round(m.caloriesKcal)} kcal</p>
                        </div>
                        <div className="meal-log-row__actions">
                          <button
                            type="button"
                            className="meal-log-row__edit"
                            onClick={() => openEdit(m)}
                            aria-label={`Edit ${m.name}`}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="meal-log-row__drag-handle"
                            onTouchStart={e => onDragHandleTouch(e, m, slot.slotType)}
                            aria-label={`Drag ${m.name} to another slot`}
                          >
                            ≡
                          </button>
                        </div>
                      </div>
                    </SwipeableRow>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
