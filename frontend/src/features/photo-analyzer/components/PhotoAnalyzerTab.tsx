import { ChangeEvent, useMemo, useRef, useState } from 'react'
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

function getConfidenceMessage(confidence: number) {
  if (confidence >= 80) {
    return 'Looks good, give it a quick review before saving.'
  }

  if (confidence >= 55) {
    return 'Decent match, but review the details before saving.'
  }

  return 'Low confidence, review carefully before saving.'
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
      setError('Choose a photo first')
      return
    }

    setUploading(true)
    setError('')
    setSuccessMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('entryDate', currentEntryDate())
      formData.append('userNote', userNote)
      formData.append('locale', 'en')

      const response = await fetch('/api/photo-analysis/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload and analyze the photo (${response.status})`)
      }

      const payload = await response.json()
      setDraft(normalizeDraft(payload.draft))
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to save the draft (${response.status})`)
      }

      await response.json()
      setDraft((current) => (current ? { ...current, needsUserConfirmation: false } : current))
      setSuccessMessage('Saved. Daily summary updated.')
      onConfirmed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
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
              Optional note
              <textarea
                value={userNote}
                onChange={(event) => setUserNote(event.target.value)}
                rows={3}
                placeholder="For example: chicken, rice, salad"
              />
            </label>

            <label className="upload-button">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} hidden />
              <span>Choose photo</span>
            </label>

            {selectedFileName ? <p className="subtle-text">Selected: {selectedFileName}</p> : null}

            <div className="primary-actions primary-actions--inline">
              <button type="button" onClick={startAnalysis} disabled={uploading || !selectedFile}>
                {uploading ? 'Analyzing...' : 'Start analysis'}
              </button>
            </div>
          </div>
        </div>

        {previewUrl ? (
          <div className="image-preview">
            <img src={previewUrl} alt="Uploaded meal preview" />
          </div>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}

        {draft ? (
          <>
            <div className="analyzer-panel__header">
              <div>
                <p className="screen-header__meta">Meal draft</p>
                <h3>Check it, fix anything, and save</h3>
              </div>
              <div className="status-badge">
                <span className={`status-dot ${draft.needsUserConfirmation ? '' : 'status-dot--done'}`} />
                <span>{draft.needsUserConfirmation ? 'Needs confirmation' : 'Confirmed'}</span>
              </div>
            </div>

            <p className="subtle-text">Confidence: {draft.confidence || 0}% · {getConfidenceMessage(draft.confidence || 0)}</p>

            <TotalsRow totals={recalculatedTotals} />

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

            <div className="primary-actions">
              <button type="button" onClick={saveDraft} disabled={saving || uploading}>
                {saving ? 'Saving...' : 'Save meal'}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </section>
  )
}
