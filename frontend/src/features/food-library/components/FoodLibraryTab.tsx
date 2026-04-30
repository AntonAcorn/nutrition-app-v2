import { useEffect, useRef, useState } from 'react'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import type { MealTemplate, MealTemplateItem } from '../../../shared/types/nutrition'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, logTemplate, unlogTemplate } from '../model/mealTemplateApi'

interface FoodLibraryTabProps {
  onLogged?: () => void
  initialSave?: { name: string; items: MealTemplateItem[] } | null
  onInitialSaveDone?: () => void
}

interface LoggedToast {
  templateId: string
  templateName: string
  entryDate: string
}

const EMPTY_ITEM = (): MealTemplateItem => ({
  name: '', estimatedPortion: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
})

const MACRO_FIELDS: { field: keyof MealTemplateItem; label: string }[] = [
  { field: 'calories', label: 'Calories' },
  { field: 'protein',  label: 'Protein'  },
  { field: 'fat',      label: 'Fat'      },
  { field: 'carbs',    label: 'Carbs'    },
  { field: 'fiber',    label: 'Fiber'    },
]

const UNDO_TIMEOUT_MS = 6000

export function FoodLibraryTab({ onLogged, initialSave, onInitialSaveDone }: FoodLibraryTabProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MealTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [editName, setEditName] = useState('')
  const [editItems, setEditItems] = useState<MealTemplateItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<MealTemplate | null>(null)
  const [loggedToast, setLoggedToast] = useState<LoggedToast | null>(null)
  const [undoing, setUndoing] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (initialSave) {
      setCreating(true)
      setEditing(null)
      setEditName(initialSave.name)
      setEditItems(initialSave.items.length ? initialSave.items : [EMPTY_ITEM()])
    }
  }, [initialSave])

  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
  }, [])

  async function load() {
    setLoading(true)
    try { setTemplates(await listTemplates()) }
    catch { setError('Could not load library') }
    finally { setLoading(false) }
  }

  function openCreate() {
    setCreating(true); setEditing(null)
    setEditName(''); setEditItems([EMPTY_ITEM()]); setError('')
  }

  function openEdit(t: MealTemplate) {
    setEditing(t); setCreating(false)
    setEditName(t.name); setEditItems(t.items.map(i => ({ ...i }))); setError('')
  }

  function closeEditor() {
    setEditing(null); setCreating(false); onInitialSaveDone?.()
  }

  function updateItem(index: number, field: keyof MealTemplateItem, raw: string) {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const isNumeric = field !== 'name' && field !== 'estimatedPortion'
      return { ...item, [field]: isNumeric ? (parseFloat(raw) || 0) : raw }
    }))
  }

  function addItem() { setEditItems(prev => [...prev, EMPTY_ITEM()]) }
  function removeItem(index: number) { setEditItems(prev => prev.filter((_, i) => i !== index)) }

  async function save() {
    if (!editName.trim()) { setError('Enter a name for this meal'); return }
    if (editItems.length === 0) { setError('Add at least one item'); return }
    setSaving(true); setError('')
    try {
      if (editing) {
        const updated = await updateTemplate(editing.id, editName.trim(), editItems)
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
      } else {
        const created = await createTemplate(editName.trim(), editItems)
        setTemplates(prev => [created, ...prev])
      }
      closeEditor()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try { await deleteTemplate(id); setTemplates(prev => prev.filter(t => t.id !== id)) }
    catch { setError('Could not delete') }
  }

  function showUndoToast(toast: LoggedToast) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setLoggedToast(toast)
    undoTimerRef.current = setTimeout(() => setLoggedToast(null), UNDO_TIMEOUT_MS)
  }

  async function confirmLog() {
    if (!confirmTarget) return
    const t = confirmTarget
    setConfirmTarget(null)
    setLoggingId(t.id)
    const entryDate = getTodayLocalDateInputValue()
    try {
      await logTemplate(t.id, entryDate)
      onLogged?.()
      showUndoToast({ templateId: t.id, templateName: t.name, entryDate })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Log failed')
    } finally { setLoggingId(null) }
  }

  async function handleUndo() {
    if (!loggedToast) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setLoggedToast(null)
    setUndoing(true)
    try {
      await unlogTemplate(loggedToast.templateId, loggedToast.entryDate)
      onLogged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Undo failed')
    } finally { setUndoing(false) }
  }

  /* ── Editor ── */
  if (editing || creating) {
    const totalCal = editItems.reduce((s, i) => s + (Number(i.calories) || 0), 0)
    return (
      <div className="library-editor">
        <div className="library-editor__header">
          <button type="button" className="library-back-btn" onClick={closeEditor}>← Back</button>
          <h3 className="library-editor__title">{editing ? 'Edit meal' : 'New meal'}</h3>
        </div>

        <label className="draft-item-card__name-field" style={{ display: 'grid', gap: 6 }}>
          <span className="draft-item-card__field-label">Meal name</span>
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="e.g. My usual breakfast"
            style={{ minHeight: 46 }}
          />
        </label>

        <div className="library-items-list">
          {editItems.map((item, i) => (
            <article key={i} className="draft-item-card">
              <div className="draft-item-card__header">
                <label className="draft-item-card__name-field">
                  <span className="draft-item-card__field-label">Name</span>
                  <input
                    value={item.name}
                    placeholder="e.g. Oatmeal"
                    onChange={e => updateItem(i, 'name', e.target.value)}
                  />
                </label>
                <label className="draft-item-card__portion-field">
                  <span className="draft-item-card__field-label">Portion</span>
                  <input
                    value={item.estimatedPortion}
                    placeholder="e.g. 100g"
                    onChange={e => updateItem(i, 'estimatedPortion', e.target.value)}
                  />
                </label>
              </div>

              <div className="draft-item-card__grid">
                {MACRO_FIELDS.map(({ field, label }) => (
                  <label key={field} className="draft-item-card__metric-field">
                    <span className="draft-item-card__field-label">{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item[field] || ''}
                      placeholder="0"
                      onChange={e => updateItem(i, field, e.target.value)}
                    />
                  </label>
                ))}
              </div>

              {editItems.length > 1 && (
                <button type="button" className="library-remove-item-btn" onClick={() => removeItem(i)}>
                  Remove item
                </button>
              )}
            </article>
          ))}
        </div>

        <button type="button" className="library-add-item-btn" onClick={addItem}>+ Add item</button>

        {totalCal > 0 && (
          <p className="subtle-text" style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            {Math.round(totalCal)} kcal total
          </p>
        )}

        {error && <p className="error-text">{error}</p>}

        <div className="primary-actions">
          <button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save meal'}
          </button>
        </div>
      </div>
    )
  }

  /* ── List ── */
  return (
    <div className="library-tab">
      <div className="library-tab__header">
        <h3 className="library-tab__title">Food Library</h3>
        <button type="button" className="library-new-btn" onClick={openCreate}>+ New</button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {undoing && <p className="subtle-text" style={{ textAlign: 'center', fontSize: '0.85rem' }}>Removing...</p>}

      {loading ? (
        <p className="subtle-text" style={{ textAlign: 'center', marginTop: 32 }}>Loading...</p>
      ) : templates.length === 0 ? (
        <div className="library-empty">
          <p>No saved meals yet.</p>
          <p className="subtle-text">After analyzing a photo or voice, tap "Save to library" — or create one manually with + New.</p>
        </div>
      ) : (
        <div className="library-list">
          {templates.map(t => (
            <div key={t.id} className="library-card">
              <div className="library-card__info">
                <p className="library-card__name">{t.name}</p>
                <p className="library-card__meta">
                  {Math.round(t.totalCalories)} kcal · {t.items.length} item{t.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="library-card__actions">
                <button type="button" className="library-card__edit-btn" onClick={() => openEdit(t)}>Edit</button>
                <button
                  type="button"
                  className="library-card__log-btn"
                  onClick={() => setConfirmTarget(t)}
                  disabled={loggingId === t.id}
                >
                  {loggingId === t.id ? '...' : 'Log'}
                </button>
                <button type="button" className="library-card__delete-btn" onClick={() => handleDelete(t.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmTarget && (
        <div className="library-confirm-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="library-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="library-confirm-title">Log this meal?</p>
            <p className="library-confirm-meal">{confirmTarget.name}</p>
            <p className="library-confirm-meta">
              {Math.round(confirmTarget.totalCalories)} kcal · {confirmTarget.items.length} item{confirmTarget.items.length !== 1 ? 's' : ''}
            </p>
            <div className="library-confirm-actions">
              <button type="button" className="library-confirm-cancel" onClick={() => setConfirmTarget(null)}>
                Cancel
              </button>
              <button type="button" className="library-confirm-ok" onClick={confirmLog}>
                Log meal
              </button>
            </div>
          </div>
        </div>
      )}

      {loggedToast && (
        <div className="library-undo-toast">
          <span className="library-undo-toast__text">"{loggedToast.templateName}" added to today</span>
          <button type="button" className="library-undo-toast__btn" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
