import { useEffect, useMemo, useState } from 'react'
import { TodaySummaryBlock } from './features/today-summary/TodaySummaryBlock'
import { getTodaySummaryMock } from './features/today-summary/mockTodaySummary'

const numericFields = ['grams', 'calories', 'protein', 'fat', 'carbs', 'fiber']
const tabs = {
  currentDay: 'current-day',
  photoAnalyzer: 'photo-analyzer',
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function normalizeDraft(payload) {
  const source = payload?.analysis ?? payload?.draft ?? payload ?? {}
  const items = Array.isArray(source.items)
    ? source.items.map((item, index) => ({
        id: item.id ?? `item-${index}`,
        name: item.name ?? '',
        grams: toNumber(item.grams),
        calories: toNumber(item.calories),
        protein: toNumber(item.protein),
        fat: toNumber(item.fat),
        carbs: toNumber(item.carbs),
        fiber: toNumber(item.fiber),
      }))
    : []

  const notes = Array.isArray(source.notes)
    ? source.notes
    : typeof source.notes === 'string'
      ? source.notes.split('\n').filter(Boolean)
      : []

  const totalsFromBackend = source.totals ?? {}

  const calculatedTotals = items.reduce(
    (acc, item) => {
      acc.calories += toNumber(item.calories)
      acc.protein += toNumber(item.protein)
      acc.fat += toNumber(item.fat)
      acc.carbs += toNumber(item.carbs)
      acc.fiber += toNumber(item.fiber)
      return acc
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  )

  return {
    id: payload?.id ?? source.id ?? 'latest',
    items,
    totals: {
      calories: toNumber(totalsFromBackend.calories || calculatedTotals.calories),
      protein: toNumber(totalsFromBackend.protein || calculatedTotals.protein),
      fat: toNumber(totalsFromBackend.fat || calculatedTotals.fat),
      carbs: toNumber(totalsFromBackend.carbs || calculatedTotals.carbs),
      fiber: toNumber(totalsFromBackend.fiber || calculatedTotals.fiber),
    },
    notes,
    confidence: toNumber(source.confidence),
    needsUserConfirmation: source.needsUserConfirmation !== false,
  }
}

function DraftItemEditor({ item, onChange }) {
  return (
    <article className="draft-item">
      <label>
        Название
        <input value={item.name} onChange={(e) => onChange(item.id, 'name', e.target.value)} />
      </label>

      <div className="draft-item__grid">
        {numericFields.map((field) => (
          <label key={field}>
            {field}
            <input
              type="number"
              step="0.1"
              value={item[field]}
              onChange={(e) => onChange(item.id, field, e.target.value)}
            />
          </label>
        ))}
      </div>
    </article>
  )
}

function TotalsRow({ totals }) {
  return (
    <div className="totals-row">
      <span>ккал: {totals.calories.toFixed(0)}</span>
      <span>б: {totals.protein.toFixed(1)} г</span>
      <span>ж: {totals.fat.toFixed(1)} г</span>
      <span>у: {totals.carbs.toFixed(1)} г</span>
      <span>клетч.: {totals.fiber.toFixed(1)} г</span>
    </div>
  )
}

function CurrentDayTab() {
  const summary = getTodaySummaryMock()

  return (
    <section className="tab-content">
      <section className="panel section-panel">
        <div className="section-head section-head--stacked">
          <div>
            <p className="eyebrow eyebrow--soft">Current day</p>
            <h2>Текущая сводка за день</h2>
          </div>
          <p className="muted">Пока тут mock-данные. На следующем шаге подключу реальный backend summary.</p>
        </div>

        <TodaySummaryBlock summary={summary} />
      </section>
    </section>
  )
}

function PhotoAnalyzerTab() {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [finalEntry, setFinalEntry] = useState(null)

  const draftId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('draftId') || 'latest'
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDraft() {
      setLoading(true)
      setError('')

      try {
        const url = draftId === 'latest' ? '/api/photo-analysis/drafts/latest' : `/api/photo-analysis/drafts/${draftId}`
        const response = await fetch(url, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Не удалось загрузить draft (${response.status})`)
        }

        const payload = await response.json()
        setDraft(normalizeDraft(payload))
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Ошибка загрузки draft')
        }
      } finally {
        setLoading(false)
      }
    }

    loadDraft()
    return () => controller.abort()
  }, [draftId])

  const recalculatedTotals = useMemo(() => {
    if (!draft) {
      return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    }

    return draft.items.reduce(
      (acc, item) => {
        acc.calories += toNumber(item.calories)
        acc.protein += toNumber(item.protein)
        acc.fat += toNumber(item.fat)
        acc.carbs += toNumber(item.carbs)
        acc.fiber += toNumber(item.fiber)
        return acc
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    )
  }, [draft])

  function updateItem(itemId, field, value) {
    setDraft((current) => {
      if (!current) {
        return current
      }

      const updatedItems = current.items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        if (field === 'name') {
          return { ...item, [field]: value }
        }

        return { ...item, [field]: toNumber(value) }
      })

      return {
        ...current,
        items: updatedItems,
      }
    })
  }

  function updateNotes(value) {
    setDraft((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        notes: value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      }
    })
  }

  async function saveDraft() {
    if (!draft) {
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      ...draft,
      totals: recalculatedTotals,
      needsUserConfirmation: false,
    }

    try {
      const response = await fetch(`/api/photo-analysis/drafts/${draft.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Не удалось сохранить draft (${response.status})`)
      }

      const result = await response.json()
      setFinalEntry(result?.mealEntry ?? result)
      setDraft((current) => (current ? { ...current, needsUserConfirmation: false } : current))
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="tab-content">
      <section className="panel section-panel draft-review-panel">
        {loading ? <p>Загружаем draft...</p> : null}
        {!loading && error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && draft ? (
          <>
            <div className="draft-header">
              <div>
                <p className="eyebrow eyebrow--soft">Photo analyzer</p>
                <h2>Проверь, поправь и сохрани анализ фото</h2>
              </div>
              <div className="topbar__badge">
                <span className={`status-dot ${draft.needsUserConfirmation ? '' : 'status-dot--done'}`} />
                <span>{draft.needsUserConfirmation ? 'Ожидает подтверждения' : 'Подтверждён'}</span>
              </div>
            </div>

            <p className="muted">Confidence: {draft.confidence || 0}%</p>

            <div className="draft-items">
              {draft.items.map((item) => (
                <DraftItemEditor key={item.id} item={item} onChange={updateItem} />
              ))}
            </div>

            <div className="notes-block">
              <label>
                Notes
                <textarea value={draft.notes.join('\n')} onChange={(e) => updateNotes(e.target.value)} rows={4} />
              </label>
            </div>

            <TotalsRow totals={recalculatedTotals} />

            <div className="draft-actions">
              <button type="button" onClick={saveDraft} disabled={saving}>
                {saving ? 'Сохраняем...' : 'Save и подтвердить'}
              </button>
            </div>
          </>
        ) : null}
      </section>

      {finalEntry ? (
        <section className="panel section-panel final-entry-panel">
          <p className="eyebrow eyebrow--soft">Сохранённый meal entry</p>
          <h2>Ответ backend после подтверждения</h2>
          <pre>{JSON.stringify(finalEntry, null, 2)}</pre>
        </section>
      ) : null}
    </section>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState(tabs.currentDay)

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Nutrition App v2</p>
          <h1>Дневная сводка и анализ фото еды</h1>
        </div>
      </section>

      <section className="tabs-shell panel">
        <div className="tabs-header" role="tablist" aria-label="Nutrition app sections">
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.currentDay ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.currentDay}
            onClick={() => setActiveTab(tabs.currentDay)}
          >
            Current day
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.photoAnalyzer ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.photoAnalyzer}
            onClick={() => setActiveTab(tabs.photoAnalyzer)}
          >
            Photo analyzer
          </button>
        </div>

        <div className="tabs-body">
          {activeTab === tabs.currentDay ? <CurrentDayTab /> : null}
          {activeTab === tabs.photoAnalyzer ? <PhotoAnalyzerTab /> : null}
        </div>
      </section>
    </main>
  )
}
