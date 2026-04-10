import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { LIVE_APP_USER_ID } from '../../../shared/config/appUser'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'

interface PhotoAnalyzerTabProps {
  onConfirmed?: () => void
}

function currentEntryDate(): string {
  return getTodayLocalDateInputValue()
}

export function PhotoAnalyzerTab({ onConfirmed }: PhotoAnalyzerTabProps) {
  const [draft, setDraft] = useState<PhotoAnalysisDraft | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [userNote, setUserNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

          if (field === 'name' || field === 'estimatedPortion') {
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

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setSuccessMessage('')
    setDraft(null)
    setSelectedFile(file)
    setSelectedFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function startAnalysis() {
    if (!selectedFile) {
      setError('Сначала выбери фото')
      return
    }

    setUploading(true)
    setError('')
    setSuccessMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('userId', LIVE_APP_USER_ID)
      formData.append('entryDate', currentEntryDate())
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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки фото')
    } finally {
      setUploading(false)
    }
  }

  async function saveDraft() {
    if (!draft) {
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')

    const payload = {
      caloriesKcal: recalculatedTotals.calories,
      proteinG: recalculatedTotals.protein,
      fatG: recalculatedTotals.fat,
      fiberG: recalculatedTotals.fiber,
      notes: draft.notes.join('\n'),
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
        throw new Error(`Не удалось сохранить черновик (${response.status})`)
      }

      await response.json()
      setDraft((current) => (current ? { ...current, needsUserConfirmation: false } : current))
      setSuccessMessage('Сохранено. Сводка за день обновлена.')
      onConfirmed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="screen-section screen-section--photo-dark">
      <section className="panel analyzer-panel analyzer-panel--hero analyzer-panel--dark">
        <div className="analyzer-hero">
          <div>
            <p className="screen-header__meta">Photo analysis</p>
            <h2>{draft ? 'Review the result' : 'Add a photo to start analysis'}</h2>
          </div>

          <div className="upload-panel__controls">
            <label className="upload-panel__note">
              Комментарий для модели
              <textarea
                value={userNote}
                onChange={(event) => setUserNote(event.target.value)}
                rows={3}
                placeholder="Например: курица, рис, салат"
              />
            </label>

            <label className="upload-button">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} hidden />
              <span>Выбрать фото</span>
            </label>

            {selectedFileName ? <p className="subtle-text">Выбрано: {selectedFileName}</p> : null}

            <div className="primary-actions primary-actions--inline">
              <button type="button" onClick={startAnalysis} disabled={uploading || !selectedFile}>
                {uploading ? 'Анализируем...' : 'Начать анализ'}
              </button>
            </div>
          </div>
        </div>

        {previewUrl ? (
          <div className="image-preview">
            <img src={previewUrl} alt="Предпросмотр загруженной еды" />
          </div>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}

        {draft ? (
          <>
            <div className="analyzer-panel__header">
              <div>
                <p className="screen-header__meta">Черновик блюда</p>
                <h3>Проверь, поправь и сохрани</h3>
              </div>
              <div className="status-badge">
                <span className={`status-dot ${draft.needsUserConfirmation ? '' : 'status-dot--done'}`} />
                <span>{draft.needsUserConfirmation ? 'Ожидает подтверждения' : 'Подтверждён'}</span>
              </div>
            </div>

            <p className="subtle-text">Уверенность модели: {draft.confidence || 0}%</p>

            <TotalsRow totals={recalculatedTotals} />

            <div className="draft-items-list">
              {draft.items.map((item) => (
                <DraftItemEditor key={item.id} item={item} onChange={updateItem} />
              ))}
            </div>

            <div className="notes-block">
              <label>
                Заметки
                <textarea value={draft.notes.join('\n')} onChange={(event) => updateNotes(event.target.value)} rows={4} />
              </label>
            </div>

            <div className="primary-actions">
              <button type="button" onClick={saveDraft} disabled={saving || uploading}>
                {saving ? 'Сохраняем...' : 'Подтвердить и сохранить'}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </section>
  )
}
