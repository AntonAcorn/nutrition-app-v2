import { useEffect, useState } from 'react'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import type { MealTemplate, MealTemplateItem } from '../../../shared/types/nutrition'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, logTemplate } from '../model/mealTemplateApi'

interface FoodLibraryTabProps {
  onLogged?: () => void
  initialSave?: { name: string; items: MealTemplateItem[] } | null
  onInitialSaveDone?: () => void
}

const EMPTY_ITEM = (): MealTemplateItem => ({
  name: '', estimatedPortion: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
})

export function FoodLibraryTab({ onLogged, initialSave, onInitialSaveDone }: FoodLibraryTabProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // editor state
  const [editing, setEditing] = useState<MealTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [editName, setEditName] = useState('')
  const [editItems, setEditItems] = useState<MealTemplateItem[]>([])
  const [saving, setSaving] = useState(false)

  // log state
  const [loggingId, setLoggingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (initialSave) {
      setCreating(true)
      setEditName(initialSave.name)
      setEditItems(initialSave.items)
    }
  }, [initialSave])

  async function load() {
    setLoading(true)
    try {
      setTemplates(await listTemplates())
    } catch {
      setError('Could not load library')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setCreating(true)
    setEditing(null)
    setEditName('')
    setEditItems([EMPTY_ITEM()])
    setError('')
  }

  function openEdit(t: MealTemplate) {
    setEditing(t)
    setCreating(false)
    setEditName(t.name)
    setEditItems(t.items.map(i => ({ ...i })))
    setError('')
  }

  function closeEditor() {
    setEditing(null)
    setCreating(false)
    onInitialSaveDone?.()
  }

  function updateItem(index: number, field: keyof MealTemplateItem, value: string | number) {
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setEditItems(prev => [...prev, EMPTY_ITEM()])
  }

  function removeItem(index: number) {
    setEditItems(prev => prev.filter((_, i) => i !== index))
  }

  async function save() {
    if (!editName.trim()) { setError('Name is required'); return }
    if (editItems.length === 0) { setError('Add at least one item'); return }
    setSaving(true)
    setError('')
    try {
      const items = editItems.map(i => ({
        ...i,
        calories: Number(i.calories) || 0,
        protein: Number(i.protein) || 0,
        carbs: Number(i.carbs) || 0,
        fat: Number(i.fat) || 0,
        fiber: Number(i.fiber) || 0,
      }))
      if (editing) {
        const updated = await updateTemplate(editing.id, editName.trim(), items)
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
      } else {
        const created = await createTemplate(editName.trim(), items)
        setTemplates(prev => [created, ...prev])
      }
      setSuccess(editing ? 'Saved' : 'Added to library')
      closeEditor()
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch {
      setError('Could not delete')
    }
  }

  async function handleLog(t: MealTemplate) {
    setLoggingId(t.id)
    setError('')
    try {
      await logTemplate(t.id, getTodayLocalDateInputValue())
      setSuccess(`"${t.name}" logged`)
      onLogged?.()
      setTimeout(() => setSuccess(''), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Log failed')
    } finally {
      setLoggingId(null)
    }
  }

  if (editing || creating) {
    const totalCal = editItems.reduce((s, i) => s + (Number(i.calories) || 0), 0)
    return (
      <div className="library-editor">
        <div className="library-editor__header">
          <button type="button" className="library-back-btn" onClick={closeEditor}>← Back</button>
          <h2 className="library-editor__title">{editing ? 'Edit meal' : 'New meal'}</h2>
        </div>

        <label className="library-field-label">
          Name
          <input
            className="library-field-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="e.g. My usual breakfast"
          />
        </label>

        <div className="library-items">
          {editItems.map((item, i) => (
            <div key={i} className="library-item-card">
              <div className="library-item-card__row library-item-card__row--name">
                <input
                  className="library-field-input"
                  placeholder="Food name"
                  value={item.name}
                  onChange={e => updateItem(i, 'name', e.target.value)}
                />
                <input
                  className="library-field-input library-field-input--portion"
                  placeholder="Portion"
                  value={item.estimatedPortion}
                  onChange={e => updateItem(i, 'estimatedPortion', e.target.value)}
                />
              </div>
              <div className="library-item-card__row">
                {(['calories', 'protein', 'fat', 'fiber'] as const).map(field => (
                  <label key={field} className="library-macro-field">
                    <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                    <input
                      type="number"
                      min="0"
                      value={item[field] || ''}
                      onChange={e => updateItem(i, field, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              {editItems.length > 1 && (
                <button type="button" className="library-remove-item-btn" onClick={() => removeItem(i)}>Remove</button>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="library-add-item-btn" onClick={addItem}>+ Add item</button>

        {totalCal > 0 && (
          <p className="library-total-preview">{Math.round(totalCal)} kcal total</p>
        )}

        {error && <p className="error-text">{error}</p>}

        <button type="button" className="library-save-btn" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    )
  }

  return (
    <div className="library-tab">
      <div className="library-tab__header">
        <h2 className="library-tab__title">Food Library</h2>
        <button type="button" className="library-new-btn" onClick={openCreate}>+ New</button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {loading ? (
        <p className="subtle-text" style={{ textAlign: 'center', marginTop: 32 }}>Loading...</p>
      ) : templates.length === 0 ? (
        <div className="library-empty">
          <p>No saved meals yet.</p>
          <p className="subtle-text">Save a meal after analysis, or tap + New to add one manually.</p>
        </div>
      ) : (
        <div className="library-list">
          {templates.map(t => (
            <div key={t.id} className="library-card">
              <div className="library-card__info">
                <p className="library-card__name">{t.name}</p>
                <p className="library-card__meta">{Math.round(t.totalCalories)} kcal · {t.items.length} item{t.items.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="library-card__actions">
                <button type="button" className="library-card__edit-btn" onClick={() => openEdit(t)}>Edit</button>
                <button
                  type="button"
                  className="library-card__log-btn"
                  onClick={() => handleLog(t)}
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
    </div>
  )
}
