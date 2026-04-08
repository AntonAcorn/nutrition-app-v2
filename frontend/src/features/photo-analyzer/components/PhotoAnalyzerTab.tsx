import { ChangeEvent, useMemo, useState } from 'react'
import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'

interface PhotoAnalyzerTabProps {
  onConfirmed?: () => void
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'

export function PhotoAnalyzerTab({ onConfirmed }: PhotoAnalyzerTabProps) {
  const [draft, setDraft] = useState<PhotoAnalysisDraft | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [finalEntry, setFinalEntry] = useState<unknown>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [userNote, setUserNote] = useState('')

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

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploading(true)
    setError('')
    setSelectedFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
    setFinalEntry(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', DEFAULT_USER_ID)
      formData.append('userNote', userNote)
      formData.append('locale', 'ru')

      const response = await fetch('/api/photo-analysis/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Не удалось загрузить и проанализировать фото (${response.status})`)
      }

      const payload = await response.json()
      setDraft(normalizeDraft(payload.draft))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки фото')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
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
        <p className="screen-header__meta">Загрузи фото, получи draft от модели и сразу подтверди результат.</p>
      </header>

      <section className="panel analyzer-panel">
        <div className="upload-panel">
          <div>
            <p className="screen-header__eyebrow">Upload</p>
            <h3>Загрузить новое фото</h3>
            <p className="subtle-text">Поддерживаются image uploads до 10 MB.</p>
          </div>

          <div className="upload-panel__controls">
            <label className="upload-panel__note">
              Note for model
              <textarea
                value={userNote}
                onChange={(event) => setUserNote(event.target.value)}
                rows={3}
                placeholder="Например: курица, рис, салат"
              />
            </label>

            <label className="upload-button">
              <input type="file" accept="image/*" onChange={handleFileSelected} hidden />
              <span>{uploading ? 'Анализируем...' : 'Выбрать фото'}</span>
            </label>

            {selectedFileName ? <p className="subtle-text">Выбрано: {selectedFileName}</p> : null}
          </div>
        </div>

        {previewUrl ? (
          <div className="image-preview">
            <img src={previewUrl} alt="Preview of uploaded meal" />
          </div>
        ) : null}

        <div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {draft ? (
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
              <button type="button" onClick={saveDraft} disabled={saving || uploading}>
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
