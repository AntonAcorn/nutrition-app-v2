import { useEffect, useRef, useState } from 'react'
import { listTemplates } from '../../food-library/model/mealTemplateApi'
import type { MealTemplate } from '../../../shared/types/nutrition'

interface Props {
  onAdd: (calories: number, protein: number, fat: number, fiber: number, carbs: number) => Promise<void>
  onClose: () => void
}

interface ChipProps {
  label: string
  value: string
  onChange: (v: string) => void
  colorClass: string
  unit: string
}

function ChipInput({ label, value, onChange, colorClass, unit }: ChipProps) {
  const display = Number(value) || 0
  return (
    <label className={`barcode-macro-chip ${colorClass} qs-chip`}>
      <span className="barcode-macro-chip__value">{display}{unit === 'g' ? 'g' : ''}</span>
      <span className="barcode-macro-chip__label">{label}</span>
      <input
        className="qs-chip__input"
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function QuickAddSheet({ onAdd, onClose }: Props) {
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [fat, setFat]           = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fiber, setFiber]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listTemplates().then(list => setTemplates(list.slice(0, 4))).catch(() => {})
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function update() {
      const el = backdropRef.current
      if (!el) return
      el.style.height = `${vv!.height}px`
      el.style.top    = `${vv!.offsetTop}px`
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  function fillFromTemplate(t: MealTemplate) {
    setCalories(String(Math.round(t.totalCalories)))
    setProtein(String(Math.round(t.totalProtein)))
    setFat(String(Math.round(t.totalFat)))
    setCarbs(String(Math.round(t.totalCarbs)))
    setFiber(String(Math.round(t.totalFiber)))
    setError('')
  }

  async function handleSubmit() {
    const kcal = Number(calories) || 0
    if (kcal <= 0) { setError('Enter calories'); return }
    setSaving(true)
    setError('')
    try {
      await onAdd(kcal, Number(protein) || 0, Number(fat) || 0, Number(fiber) || 0, Number(carbs) || 0)
    } catch {
      setError('Failed to add')
      setSaving(false)
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div ref={backdropRef} className="qs-backdrop" onClick={handleBackdropClick}>
      <div className="qs-sheet">
        <div className="qs-header">
          <div>
            <p className="qs-title">Quick add</p>
            <p className="qs-subtitle">Tap a chip to enter value.</p>
          </div>
          <button type="button" className="qs-close" onClick={onClose}>✕</button>
        </div>

        {templates.length > 0 ? (
          <div className="qs-templates">
            <p className="qs-templates__label">Saved meals</p>
            <div className="qs-templates__list">
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="qs-template-btn"
                  onClick={() => fillFromTemplate(t)}
                >
                  <span className="qs-template-btn__name">{t.name}</span>
                  <span className="qs-template-btn__kcal">{Math.round(t.totalCalories)} kcal</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className={`barcode-macro-chip barcode-macro-chip--calories qs-chip qs-chip--calories`}>
          <span className="barcode-macro-chip__value">{Number(calories) || 0}</span>
          <span className="barcode-macro-chip__label">kcal</span>
          <input
            className="qs-chip__input"
            type="number"
            inputMode="decimal"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </label>

        <div className="barcode-macros-grid">
          <ChipInput label="protein" value={protein} onChange={setProtein} colorClass="barcode-macro-chip--protein" unit="g" />
          <ChipInput label="fat"     value={fat}     onChange={setFat}     colorClass="barcode-macro-chip--fat"     unit="g" />
          <ChipInput label="carbs"   value={carbs}   onChange={setCarbs}   colorClass="barcode-macro-chip--carbs"   unit="g" />
          <ChipInput label="fiber"   value={fiber}   onChange={setFiber}   colorClass="barcode-macro-chip--carbs"   unit="g" />
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
