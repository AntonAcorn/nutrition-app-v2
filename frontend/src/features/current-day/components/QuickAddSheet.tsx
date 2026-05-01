import { useState } from 'react'

interface Props {
  onAdd: (calories: number, protein: number, fat: number, fiber: number, carbs: number) => Promise<void>
  onClose: () => void
}

export function QuickAddSheet({ onAdd, onClose }: Props) {
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [fat, setFat]           = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fiber, setFiber]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const kcal = Number(calories) || 0
  const p    = Number(protein)  || 0
  const f    = Number(fat)      || 0
  const c    = Number(carbs)    || 0
  const fi   = Number(fiber)    || 0

  async function handleSubmit() {
    if (kcal <= 0) { setError('Enter calories'); return }
    setSaving(true)
    setError('')
    try {
      await onAdd(kcal, p, f, fi, c)
    } catch {
      setError('Failed to add')
      setSaving(false)
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="qs-backdrop" onClick={handleBackdropClick}>
      <div className="qs-sheet">
        <div className="qs-header">
          <div>
            <p className="qs-title">Quick add</p>
            <p className="qs-subtitle">No photo? Enter values directly.</p>
          </div>
          <button type="button" className="qs-close" onClick={onClose}>✕</button>
        </div>

        {/* Live macro preview chips */}
        <div className="barcode-macros-grid">
          <div className="barcode-macro-chip barcode-macro-chip--calories">
            <span className="barcode-macro-chip__value">{kcal}</span>
            <span className="barcode-macro-chip__label">kcal</span>
          </div>
          <div className="barcode-macro-chip barcode-macro-chip--protein">
            <span className="barcode-macro-chip__value">{p}g</span>
            <span className="barcode-macro-chip__label">protein</span>
          </div>
          <div className="barcode-macro-chip barcode-macro-chip--fat">
            <span className="barcode-macro-chip__value">{f}g</span>
            <span className="barcode-macro-chip__label">fat</span>
          </div>
          <div className="barcode-macro-chip barcode-macro-chip--carbs">
            <span className="barcode-macro-chip__value">{c}g</span>
            <span className="barcode-macro-chip__label">carbs</span>
          </div>
        </div>

        {/* Input fields */}
        <div className="qs-fields">
          <label className="qs-field qs-field--calories">
            <span className="qs-field__label">Calories</span>
            <div className="qs-field__wrap">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                autoFocus
              />
              <span className="qs-field__unit">kcal</span>
            </div>
          </label>

          <div className="qs-macros-row">
            {[
              { label: 'Protein', value: protein, set: setProtein },
              { label: 'Fat',     value: fat,     set: setFat     },
              { label: 'Carbs',   value: carbs,   set: setCarbs   },
              { label: 'Fiber',   value: fiber,   set: setFiber   },
            ].map(({ label, value, set }) => (
              <label key={label} className="qs-macro-field">
                <span className="qs-macro-label">{label}</span>
                <div className="qs-macro-input-wrap">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                  <span className="qs-macro-unit">g</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          type="button"
          className="profile-edit-btn"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Adding…' : 'Add to today'}
        </button>
      </div>
    </div>
  )
}
