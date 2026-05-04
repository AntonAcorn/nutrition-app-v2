import { useEffect, useState } from 'react'
import { listMealLog, deleteMealLogEntry, updateMealLogEntry, SLOT_LABELS } from '../model/mealLogApi'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import type { MealSlot, MealLogEntry } from '../model/mealLogApi'

const SLOT_ORDER: MealSlot['slotType'][] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

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
  refreshToken?: number
  onAddToSlot: (slotType: string) => void
  onDeleted: () => void
  onUpdated?: () => void
}

export function MealsLogCard({ refreshToken = 0, onAddToSlot, onDeleted, onUpdated }: Props) {
  const [slots, setSlots] = useState<MealSlot[]>(SLOT_ORDER.map(makeEmptySlot))
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    listMealLog(getTodayLocalDateInputValue())
      .then(data => setSlots(mergeWithDefaults(data)))
      .catch(() => {})
  }, [refreshToken])

  function openEdit(m: MealLogEntry) {
    setEditingId(m.id)
    setEditForm(toEditForm(m))
    setConfirmId(null)
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
    setConfirmId(null)
    setDeleteError('')
    try {
      await deleteMealLogEntry(id)
      setSlots(prev => mergeWithDefaults(
        prev
          .map(slot => ({ ...slot, items: slot.items.filter(m => m.id !== id) }))
          .filter(slot => slot.items.length > 0)
      ))
      onDeleted()
    } catch {
      setDeleteError('Failed to delete. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="panel meals-log-card">
      <p className="meals-log-card__title">Today's meals</p>
      {deleteError ? <p className="error-text" style={{ marginBottom: '0.5rem' }}>{deleteError}</p> : null}

      {slots.map((slot, idx) => {
        const kcal = slotTotalKcal(slot)
        const isLast = idx === slots.length - 1
        return (
          <div key={slot.slotType} className={`meals-log-slot${isLast ? ' meals-log-slot--last' : ''}`}>
            <div className="meals-log-slot__header">
              <span className="meals-log-slot__name">{SLOT_LABELS[slot.slotType]}</span>
              <span className="meals-log-slot__kcal">{kcal > 0 ? `${kcal} kcal` : ''}</span>
              <button
                type="button"
                className="meals-log-slot__add"
                onClick={() => onAddToSlot(slot.slotType)}
                aria-label={`Add to ${SLOT_LABELS[slot.slotType]}`}
              >
                +
              </button>
            </div>

            {slot.items.length > 0 && (
              <div className="meals-log-list">
                {slot.items.map(m => (
                  <div key={m.id} className={`meal-log-row${editingId === m.id ? ' meal-log-row--editing' : ''}`}>
                    {editingId === m.id && editForm ? (
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
                    ) : (
                      <>
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
                          {confirmId === m.id ? (
                            <div className="meal-log-row__confirm">
                              <button
                                type="button"
                                className="meal-log-row__confirm-yes"
                                onClick={() => handleDelete(m.id)}
                                disabled={deletingId === m.id}
                              >
                                {deletingId === m.id ? '…' : 'Delete'}
                              </button>
                              <button
                                type="button"
                                className="meal-log-row__confirm-no"
                                onClick={() => setConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="meal-log-row__delete"
                              onClick={() => setConfirmId(m.id)}
                              aria-label={`Delete ${m.name}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
