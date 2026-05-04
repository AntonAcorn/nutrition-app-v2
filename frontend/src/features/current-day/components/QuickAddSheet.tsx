import { useEffect, useRef, useState } from 'react'
import { listTemplates } from '../../food-library/model/mealTemplateApi'
import { searchFood } from '../../barcode/model/barcodeApi'
import type { FoodProduct } from '../../barcode/model/barcodeApi'
import type { MealTemplate } from '../../../shared/types/nutrition'

interface Props {
  onAdd: (calories: number, protein: number, fat: number, fiber: number, carbs: number, name?: string) => Promise<void>
  onLogTemplate: (templateId: string) => Promise<void>
  onClose: () => void
  onOpenAnalyzer?: (mode: 'photo' | 'voice' | 'barcode') => void
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

function round1(v: number | null | undefined): number {
  if (v == null) return 0
  return Math.round(v * 10) / 10
}

export function QuickAddSheet({ onAdd, onLogTemplate, onClose, onOpenAnalyzer }: Props) {
  const [mode, setMode] = useState<'library' | 'search' | 'manual'>('library')

  // library
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loadingLib, setLoadingLib] = useState(true)
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [libError, setLibError] = useState('')

  // search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodProduct[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<FoodProduct | null>(null)
  const [grams, setGrams] = useState('100')
  const [addingSearch, setAddingSearch] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // manual
  const [mealName, setMealName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [fat, setFat]           = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fiber, setFiber]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listTemplates()
      .then(list => setTemplates(list))
      .catch(() => {})
      .finally(() => setLoadingLib(false))
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

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setSearchError('')
      return
    }
    setSearchLoading(true)
    setSearchError('')
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchFood(searchQuery.trim())
        setSearchResults(results)
        if (results.length === 0) setSearchError('No results')
      } catch {
        setSearchError('Search failed')
      } finally {
        setSearchLoading(false)
      }
    }, 500)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery])

  function selectProduct(p: FoodProduct) {
    setSelectedProduct(p)
    setGrams('100')
    setSearchError('')
  }

  function clearSelection() {
    setSelectedProduct(null)
  }

  function calcMacro(per100g: number | null | undefined): number {
    const g = parseFloat(grams) || 0
    if (per100g == null) return 0
    return round1((per100g * g) / 100)
  }

  async function handleAddFromSearch() {
    if (!selectedProduct) return
    const g = parseFloat(grams) || 0
    if (g <= 0) return
    setAddingSearch(true)
    try {
      const kcal   = calcMacro(selectedProduct.caloriesPer100g)
      const prot   = calcMacro(selectedProduct.proteinPer100g)
      const fat    = calcMacro(selectedProduct.fatPer100g)
      const fib    = calcMacro(selectedProduct.fiberPer100g)
      const carbs  = calcMacro(selectedProduct.carbsPer100g)
      await onAdd(kcal, prot, fat, fib, carbs, selectedProduct.name)
    } catch {
      setAddingSearch(false)
    }
  }

  async function handleLogTemplate(id: string) {
    setLoggingId(id)
    setLibError('')
    try {
      await onLogTemplate(id)
    } catch {
      setLoggingId(null)
      setLibError('Failed to log meal')
    }
  }

  async function handleSubmit() {
    const kcal = Number(calories) || 0
    if (kcal <= 0) { setError('Enter calories'); return }
    setSaving(true)
    setError('')
    try {
      await onAdd(kcal, Number(protein) || 0, Number(fat) || 0, Number(fiber) || 0, Number(carbs) || 0, mealName.trim() || undefined)
    } catch {
      setError('Failed to add')
      setSaving(false)
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  const gramsNum = parseFloat(grams) || 0

  return (
    <div ref={backdropRef} className="qs-backdrop" onClick={handleBackdropClick}>
      <div className="qs-sheet">
        <div className="qs-header">
          <div>
            <p className="qs-title">Quick add</p>
            <p className="qs-subtitle">
              {mode === 'library' ? 'Tap Log to add a saved meal.' : mode === 'search' ? 'Search 3M+ products.' : 'Tap a chip to enter value.'}
            </p>
          </div>
          <button type="button" className="qs-close" onClick={onClose}>✕</button>
        </div>

        {onOpenAnalyzer && (
          <div className="qs-analyzer-row">
            <button type="button" className="qs-analyzer-btn" onClick={() => { onClose(); onOpenAnalyzer('photo') }}>
              <span className="qs-analyzer-btn__icon">📷</span>
              <span>Photo</span>
            </button>
            <button type="button" className="qs-analyzer-btn" onClick={() => { onClose(); onOpenAnalyzer('voice') }}>
              <span className="qs-analyzer-btn__icon">🎤</span>
              <span>Voice</span>
            </button>
            <button type="button" className="qs-analyzer-btn" onClick={() => { onClose(); onOpenAnalyzer('barcode') }}>
              <span className="qs-analyzer-btn__icon">▦</span>
              <span>Barcode</span>
            </button>
          </div>
        )}

        <div className="qs-mode-toggle">
          <button type="button" className={`qs-mode-btn${mode === 'library' ? ' qs-mode-btn--active' : ''}`} onClick={() => setMode('library')}>Library</button>
          <button type="button" className={`qs-mode-btn${mode === 'search'  ? ' qs-mode-btn--active' : ''}`} onClick={() => setMode('search')}>Search</button>
          <button type="button" className={`qs-mode-btn${mode === 'manual'  ? ' qs-mode-btn--active' : ''}`} onClick={() => setMode('manual')}>Manual</button>
        </div>

        {mode === 'library' && (
          loadingLib ? (
            <p className="qs-library-empty">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="qs-library-empty">No saved meals yet. Add some in the Food Library tab.</p>
          ) : (
            <>
              {libError && <p className="error-text">{libError}</p>}
              <div className="qs-library-list">
                {templates.map(t => (
                  <div key={t.id} className="qs-library-item">
                    <span className="qs-library-item__name">{t.name}</span>
                    <span className="qs-library-item__kcal">{Math.round(t.totalCalories)} kcal</span>
                    <button
                      type="button"
                      className="qs-library-item__log-btn"
                      onClick={() => handleLogTemplate(t.id)}
                      disabled={loggingId !== null}
                    >
                      {loggingId === t.id ? '...' : 'Log'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {mode === 'search' && (
          <div className="qs-search">
            {!selectedProduct ? (
              <>
                <input
                  className="qs-search__input"
                  type="text"
                  placeholder="e.g. Greek yogurt, oatmeal..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchLoading && <p className="qs-library-empty">Searching...</p>}
                {!searchLoading && searchError && <p className="qs-library-empty">{searchError}</p>}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="qs-search-results">
                    {searchResults.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        className="qs-search-result"
                        onClick={() => selectProduct(p)}
                      >
                        <span className="qs-search-result__name">{p.name}</span>
                        <span className="qs-search-result__kcal">
                          {p.caloriesPer100g != null ? `${Math.round(p.caloriesPer100g)} kcal/100g` : '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="qs-search-detail">
                <div className="qs-search-detail__header">
                  <button type="button" className="qs-search-back" onClick={clearSelection}>← Back</button>
                  <p className="qs-search-detail__name">{selectedProduct.name}</p>
                </div>

                <div className="qs-search-detail__grams-row">
                  <label className="qs-search-detail__grams-label">Portion (g)</label>
                  <input
                    className="qs-search-detail__grams-input"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    value={grams}
                    onChange={e => setGrams(e.target.value)}
                  />
                </div>

                <div className="qs-search-detail__macros">
                  <div className="qs-search-detail__macro qs-search-detail__macro--cal">
                    <span className="qs-search-detail__macro-val">{calcMacro(selectedProduct.caloriesPer100g)}</span>
                    <span className="qs-search-detail__macro-lbl">kcal</span>
                  </div>
                  <div className="qs-search-detail__macro">
                    <span className="qs-search-detail__macro-val">{calcMacro(selectedProduct.proteinPer100g)}g</span>
                    <span className="qs-search-detail__macro-lbl">protein</span>
                  </div>
                  <div className="qs-search-detail__macro">
                    <span className="qs-search-detail__macro-val">{calcMacro(selectedProduct.fatPer100g)}g</span>
                    <span className="qs-search-detail__macro-lbl">fat</span>
                  </div>
                  <div className="qs-search-detail__macro">
                    <span className="qs-search-detail__macro-val">{calcMacro(selectedProduct.carbsPer100g)}g</span>
                    <span className="qs-search-detail__macro-lbl">carbs</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={handleAddFromSearch}
                  disabled={addingSearch || gramsNum <= 0}
                >
                  {addingSearch ? 'Adding…' : 'Add to today'}
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <>
            <input
              className="qs-name-input"
              type="text"
              placeholder="Meal name (optional)"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
            />
            <label className="barcode-macro-chip barcode-macro-chip--calories qs-chip qs-chip--calories">
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
          </>
        )}
      </div>
    </div>
  )
}
