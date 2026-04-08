import { useEffect, useMemo, useState } from 'react'
import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'

interface PhotoAnalyzerTabProps {
  onConfirmed?: () => void
}

export function PhotoAnalyzerTab({ onConfirmed }: PhotoAnalyzerTabProps) {
  const [draft, setDraft] = useState<PhotoAnalysisDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [finalEntry, setFinalEntry] = useState<unknown>(null)

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
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки draft')
        }
      } finally {
        setLoading(false)
      }
    }

    loadDraft()
    return () => controller.abort()
  }, [draftId])

  const recalculatedTotals = useMemo(() => (draft ? calculateTotals(draft.items) : calculateTotals([])), [draft])

  function updateItem(itemId: string, field: keyof DraftItem, value: string) {
    setDraft((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        items: current.items.map((item) => {
          if (item.id !== itemId) {
            return item
          }

          if (field === 'name') {
            return { ...item, [field]: value }
          }

          return { ...item, [field]: toNumber(value) }
        }),
      }
    })
  }

  function updateNotes(value: string) {
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
      setFinalEntry(result)
      setDraft((current) => (current ? { ...current, needsUserConfirmation: false } : current))
      onConfirmed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="screen-section">
      <header className="screen-header">
        <div>
          <p className="screen-header__eyebrow">Photo analyzer</p>
          <h2>Анализ фото и подтверждение</h2>
        </div>
        <p className="screen-header__meta">Тут будет новый upload flow, а пока я привёл в порядок экран review draft.</p>
      </header>

      <section className="panel analyzer-panel">
        {loading ? <p>Загружаем draft...</p> : null}
        {!loading && error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && draft ? (
          <>
            <div className="analyzer-panel__header">
              <div>
                <p className="screen-header__eyebrow">Draft</p>
                <h3>Проверь, поправь и сохрани</h3>
              </div>
              <div className="status-badge">
                <span className={`status-dot ${draft.needsUserConfirmation ? '' : 'status-dot--done'}`} />
                <span>{draft.needsUserConfirmation ? 'Ожидает подтверждения' : 'Подтверждён'}</span>
              </div>
            </div>

            <p className="subtle-text">Confidence: {draft.confidence || 0}%</p>

            <div className="draft-items-list">
              {draft.items.map((item) => (
                <DraftItemEditor key={item.id} item={item} onChange={updateItem} />
              ))}
            </div>

            <div className="notes-block">
              <label>
                Notes
                <textarea value={draft.notes.join('\n')} onChange={(event) => updateNotes(event.target.value)} rows={4} />
              </label>
            </div>

            <TotalsRow totals={recalculatedTotals} />

            <div className="primary-actions">
              <button type="button" onClick={saveDraft} disabled={saving}>
                {saving ? 'Сохраняем...' : 'Save и подтвердить'}
              </button>
            </div>
          </>
        ) : null}
      </section>

      {finalEntry ? (
        <section className="panel final-entry-panel">
          <p className="screen-header__eyebrow">Backend response</p>
          <h3>Черновик подтверждён</h3>
          <pre>{JSON.stringify(finalEntry, null, 2)}</pre>
        </section>
      ) : null}
    </section>
  )
}
