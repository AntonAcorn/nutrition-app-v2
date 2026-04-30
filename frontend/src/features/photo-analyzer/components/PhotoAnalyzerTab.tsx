import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'
import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'
import { analyzeVoice } from '../model/voiceAnalysisApi'

// Capacitor Camera is loaded dynamically to avoid breaking web builds
async function pickPhotoNative(): Promise<File | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    })
    if (!photo.webPath) return null
    const res = await fetch(photo.webPath)
    const blob = await res.blob()
    return new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}

async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

interface PhotoAnalyzerTabProps {
  onConfirmed?: () => void
}

function currentEntryDate(): string {
  return getTodayLocalDateInputValue()
}

function getConfidenceMessage(confidence: number) {
  if (confidence >= 80) return 'Looks good, give it a quick review before saving.'
  if (confidence >= 55) return 'Decent match, but review the details before saving.'
  return 'Low confidence, review carefully before saving.'
}

type AnalyzerMode = 'photo' | 'voice'

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function PhotoAnalyzerTab({ onConfirmed }: PhotoAnalyzerTabProps) {
  const [mode, setMode] = useState<AnalyzerMode>('photo')

  // Shared draft state
  const [draft, setDraft] = useState<PhotoAnalysisDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Photo mode state
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [userNote, setUserNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  // Voice mode state
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [speechSupported] = useState(() => getSpeechRecognition() !== null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const interimRef = useRef('')

  const recalculatedTotals = useMemo(() => (draft ? calculateTotals(draft.items) : calculateTotals([])), [draft])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  function switchMode(next: AnalyzerMode) {
    recognitionRef.current?.stop()
    setMode(next)
    setDraft(null)
    setError('')
    setSuccessMessage('')
    setRecording(false)
  }

  // ── Photo mode ──────────────────────────────────────────────────────────

  function applyFile(file: File) {
    setError('')
    setSuccessMessage('')
    setDraft(null)
    setSelectedFile(file)
    setSelectedFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) applyFile(file)
  }

  async function handleTakePhoto() {
    if (await isNativePlatform()) {
      const file = await pickPhotoNative()
      if (file) applyFile(file)
    } else {
      fileInputRef.current?.click()
    }
  }

  async function startPhotoAnalysis() {
    if (!selectedFile) { setError('Choose a photo first'); return }
    setUploading(true)
    setError('')
    setSuccessMessage('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('entryDate', currentEntryDate())
      formData.append('userNote', userNote)
      formData.append('locale', 'en')
      const response = await fetch(`${API_BASE}/api/photo-analysis/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!response.ok) throw new Error(`Failed to analyze photo (${response.status})`)
      const payload = await response.json()
      setDraft(normalizeDraft(payload.draft))
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Voice mode ──────────────────────────────────────────────────────────

  function startRecording() {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'
    interimRef.current = ''

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalPart = ''
      let interimPart = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalPart += result[0].transcript
        } else {
          interimPart += result[0].transcript
        }
      }
      interimRef.current = interimPart
      setTranscript(finalPart + (interimPart ? ' ' + interimPart : ''))
    }

    recognition.onerror = () => {
      setRecording(false)
    }

    recognition.onend = () => {
      setRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
    setError('')
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  async function startVoiceAnalysis() {
    if (!transcript.trim()) { setError('Dictate something first'); return }
    setAnalyzing(true)
    setError('')
    setSuccessMessage('')
    try {
      const result = await analyzeVoice(transcript.trim(), navigator.language?.slice(0, 2) || 'en', currentEntryDate())
      setDraft(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Draft editing (shared) ──────────────────────────────────────────────

  function updateItem(itemId: string, field: keyof DraftItem, value: string) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        items: current.items.map((item) => {
          if (item.id !== itemId) return item
          if (field === 'name' || field === 'estimatedPortion') return { ...item, [field]: value }
          return { ...item, [field]: toNumber(value) }
        }),
      }
    })
  }

  function updateNotes(value: string) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        notes: value.split('\n').map((line) => line.trim()).filter(Boolean),
      }
    })
  }

  async function saveDraft() {
    if (!draft) return
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
      const response = await fetch(`${API_BASE}/api/photo-analysis/drafts/${draft.id}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Failed to save (${response.status})`)
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
      <section className="panel analyzer-panel analyzer-panel--dark">

        {/* Mode toggle */}
        {!draft ? (
          <div className="analyzer-mode-toggle">
            <button
              type="button"
              className={`analyzer-mode-btn ${mode === 'photo' ? 'analyzer-mode-btn--active' : ''}`}
              onClick={() => switchMode('photo')}
            >
              📷 Photo
            </button>
            <button
              type="button"
              className={`analyzer-mode-btn ${mode === 'voice' ? 'analyzer-mode-btn--active' : ''}`}
              onClick={() => switchMode('voice')}
            >
              🎤 Voice
            </button>
          </div>
        ) : null}

        {/* Photo mode */}
        {mode === 'photo' && !draft ? (
          <div className="photo-upload-hero">
            <img src="/mascot/camera.png" alt="" className="photo-upload-hero__mascot" />
            <h2 className="photo-upload-hero__title">Take a photo of your meal</h2>

            <label className="upload-panel__note photo-upload-hero__note">
              Optional note
              <textarea
                value={userNote}
                onChange={(event) => setUserNote(event.target.value)}
                rows={2}
                placeholder="e.g. chicken, rice, salad"
              />
            </label>

            <div className="upload-button-group">
              <button type="button" className="upload-button" onClick={handleTakePhoto}>
                <span>Take photo</span>
              </button>
              <label className="upload-button upload-button--secondary">
                <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelected} hidden />
                <span>Choose from gallery</span>
              </label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} hidden />
            </div>

            {selectedFileName ? <p className="subtle-text" style={{ textAlign: 'center', fontSize: '0.8rem' }}>📎 {selectedFileName}</p> : null}

            {selectedFile ? (
              <button type="button" className="photo-upload-hero__analyze-btn" onClick={startPhotoAnalysis} disabled={uploading}>
                {uploading ? 'Analyzing...' : 'Start analysis'}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Voice mode */}
        {mode === 'voice' && !draft ? (
          <div className="voice-hero">
            <img src="/mascot/happy.png" alt="" className="voice-hero__mascot" />
            <h2 className="voice-hero__title">Describe your meal</h2>
            <p className="voice-hero__hint">
              {speechSupported
                ? 'Tap the mic and say what you ate'
                : 'Type what you ate below'}
            </p>

            {speechSupported ? (
              <button
                type="button"
                className={`voice-mic-btn ${recording ? 'voice-mic-btn--recording' : ''}`}
                onClick={recording ? stopRecording : startRecording}
              >
                <span className="voice-mic-btn__icon">{recording ? '⏹' : '🎤'}</span>
                <span>{recording ? 'Stop' : 'Start recording'}</span>
              </button>
            ) : null}

            <label className="voice-transcript-label">
              {recording ? 'Listening...' : 'What you said'}
              <textarea
                className="voice-transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                placeholder="e.g. I had a bowl of oatmeal with banana and a cup of coffee"
              />
            </label>

            {transcript.trim() ? (
              <button
                type="button"
                className="photo-upload-hero__analyze-btn"
                onClick={startVoiceAnalysis}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Photo preview */}
        {mode === 'photo' && previewUrl && !draft ? (
          <div className="image-preview">
            <img src={previewUrl} alt="Uploaded meal preview" />
          </div>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}

        {/* Draft review (shared for both modes) */}
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
              <button type="button" onClick={saveDraft} disabled={saving}>
                {saving ? 'Saving...' : 'Save meal'}
              </button>
              <button type="button" className="voice-discard-btn" onClick={() => { setDraft(null); setTranscript('') }}>
                Discard
              </button>
            </div>
          </>
        ) : null}

      </section>
    </section>
  )
}
