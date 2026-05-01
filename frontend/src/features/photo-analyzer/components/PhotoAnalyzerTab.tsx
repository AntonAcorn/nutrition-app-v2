import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'
import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, MealTemplateItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'
import { analyzeVoice } from '../model/voiceAnalysisApi'
import { FoodLibraryTab } from '../../food-library/components/FoodLibraryTab'
import { BarcodeScannerMode } from '../../barcode/components/BarcodeScannerMode'

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
  const pct = confidence > 1 ? confidence : confidence * 100
  if (pct >= 80) return 'Looks good, give it a quick review before saving.'
  if (pct >= 55) return 'Decent match, but review the details before saving.'
  return 'Low confidence, review carefully before saving.'
}

type AnalyzerMode = 'photo' | 'voice' | 'library' | 'barcode'

// Web Speech API types (web fallback)
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

function getWebSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

async function nativeSpeechAvailable(): Promise<boolean> {
  if (!(await isNativePlatform())) return false
  try {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
    const { available } = await SpeechRecognition.available()
    return available
  } catch {
    return false
  }
}

export function PhotoAnalyzerTab({ onConfirmed }: PhotoAnalyzerTabProps) {
  const [mode, setMode] = useState<AnalyzerMode>('photo')
  const [pendingLibrarySave, setPendingLibrarySave] = useState<{ name: string; items: MealTemplateItem[] } | null>(null)

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
  const [speechSupported, setSpeechSupported] = useState(false)
  const [recognitionLang, setRecognitionLang] = useState('en-US')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  // Cached at mount so startRecording() needs no await before recognition.start()
  // (Safari loses the user gesture context on any await before getUserMedia/start)
  const isNativeRef = useRef<boolean>(false)

  // Note voice input state
  const [noteRecording, setNoteRecording] = useState(false)
  const noteRecognitionRef = useRef<SpeechRecognition | null>(null)
  const noteBaseRef = useRef<string>('')

  const recalculatedTotals = useMemo(() => (draft ? calculateTotals(draft.items) : calculateTotals([])), [draft])

  useEffect(() => {
    async function checkSpeech() {
      const native = await nativeSpeechAvailable()
      if (native) {
        isNativeRef.current = true
        setSpeechSupported(true)
      } else {
        const onNative = await isNativePlatform()
        isNativeRef.current = onNative
        // On native platform, webkitSpeechRecognition exists but doesn't work in WKWebView
        setSpeechSupported(!onNative && getWebSpeechRecognition() !== null)
      }
    }
    checkSpeech()
    return () => { stopRecording() }
  }, [])

  function switchMode(next: AnalyzerMode) {
    stopRecording()
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

  async function startRecording() {
    setError('')
    try {
      if (isNativeRef.current) {
        await startNativeRecording()
      } else {
        // Must be called without any preceding await so Safari preserves
        // the user gesture context required for microphone access
        startWebRecording()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording')
    }
  }

  async function startNativeRecording() {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      const perm = await SpeechRecognition.requestPermissions()
      if (perm.speechRecognition !== 'granted' || perm.microphone !== 'granted') {
        setError('Microphone permission is required')
        return
      }
      await SpeechRecognition.start({
        language: recognitionLang,
        maxResults: 1,
        partialResults: true,
        popup: false,
      })
      await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches?.length) setTranscript(data.matches[0])
      })
      setRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording')
    }
  }

  function startWebRecording() {
    const WebSpeech = getWebSpeechRecognition()
    if (!WebSpeech) return
    const recognition = new WebSpeech()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = recognitionLang
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      setTranscript(final + (interim ? ' ' + interim : ''))
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Microphone error: ${event.error}`)
      }
      setRecording(false)
    }
    recognition.onend = () => setRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  async function stopRecording() {
    if (isNativeRef.current) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
        await SpeechRecognition.stop()
        await SpeechRecognition.removeAllListeners()
      } catch {}
    } else {
      recognitionRef.current?.stop()
    }
    setRecording(false)
  }

  function startNoteRecording() {
    const WebSpeech = getWebSpeechRecognition()
    if (!WebSpeech) return
    noteBaseRef.current = userNote
    const recognition = new WebSpeech()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = recognitionLang
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      const spoken = final + (interim ? interim : '')
      const base = noteBaseRef.current
      setUserNote(base ? base + ' ' + spoken : spoken)
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Microphone error: ${event.error}`)
      }
      setNoteRecording(false)
    }
    recognition.onend = () => setNoteRecording(false)
    noteRecognitionRef.current = recognition
    recognition.start()
    setNoteRecording(true)
  }

  function stopNoteRecording() {
    noteRecognitionRef.current?.stop()
    setNoteRecording(false)
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
              Photo
            </button>
            <button
              type="button"
              className={`analyzer-mode-btn ${mode === 'voice' ? 'analyzer-mode-btn--active' : ''}`}
              onClick={() => switchMode('voice')}
            >
              Describe
            </button>
            <button
              type="button"
              className={`analyzer-mode-btn ${mode === 'library' ? 'analyzer-mode-btn--active' : ''}`}
              onClick={() => switchMode('library')}
            >
              Library
            </button>
            <button
              type="button"
              className={`analyzer-mode-btn ${mode === 'barcode' ? 'analyzer-mode-btn--active' : ''}`}
              onClick={() => switchMode('barcode')}
            >
              Scan
            </button>
          </div>
        ) : null}

        {/* Photo mode */}
        {mode === 'photo' && !draft ? (
          <div className="photo-upload-hero">
            <img src="/mascot/camera.png" alt="" className="photo-upload-hero__mascot" />
            <h2 className="photo-upload-hero__title">Take a photo of your meal</h2>

            <div className="upload-panel__note photo-upload-hero__note">
              <div className="note-label-row">
                <span>Optional note</span>
                {speechSupported && (
                  <div className="note-mic-controls">
                    <div className="voice-lang-picker">
                      {[
                        { code: 'en-US', label: 'EN' },
                        { code: 'ru-RU', label: 'RU' },
                        { code: 'fr-FR', label: 'FR' },
                        { code: 'es-ES', label: 'ES' },
                      ].map(({ code, label }) => (
                        <button
                          key={code}
                          type="button"
                          className={`voice-lang-btn ${recognitionLang === code ? 'voice-lang-btn--active' : ''}`}
                          onClick={() => setRecognitionLang(code)}
                          disabled={noteRecording}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`note-mic-btn ${noteRecording ? 'note-mic-btn--active' : ''}`}
                      onClick={noteRecording ? stopNoteRecording : startNoteRecording}
                      aria-label={noteRecording ? 'Stop dictation' : 'Dictate note'}
                    >
                      {noteRecording ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <rect x="4" y="4" width="16" height="16" rx="3"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <textarea
                value={userNote}
                onChange={(event) => setUserNote(event.target.value)}
                rows={2}
                placeholder="e.g. chicken, rice, salad"
                className={noteRecording ? 'note-textarea--recording' : ''}
              />
            </div>

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

        {/* Voice / Text mode */}
        {mode === 'voice' && !draft ? (
          <div className="voice-hero">
            <img src="/mascot/happy.png" alt="" className="voice-hero__mascot" />
            <h2 className="voice-hero__title">Describe your meal</h2>
            <p className="voice-hero__hint">Speak or type what you ate</p>

            <div className="upload-panel__note voice-hero__input">
              <div className="note-label-row">
                <span>Your meal</span>
                {speechSupported && (
                  <div className="note-mic-controls">
                    <div className="voice-lang-picker">
                      {[
                        { code: 'en-US', label: 'EN' },
                        { code: 'ru-RU', label: 'RU' },
                        { code: 'fr-FR', label: 'FR' },
                        { code: 'es-ES', label: 'ES' },
                      ].map(({ code, label }) => (
                        <button
                          key={code}
                          type="button"
                          className={`voice-lang-btn ${recognitionLang === code ? 'voice-lang-btn--active' : ''}`}
                          onClick={() => setRecognitionLang(code)}
                          disabled={recording}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`note-mic-btn ${recording ? 'note-mic-btn--active' : ''}`}
                      onClick={recording ? stopRecording : startRecording}
                      aria-label={recording ? 'Stop recording' : 'Start recording'}
                    >
                      {recording ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <rect x="4" y="4" width="16" height="16" rx="3"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={5}
                placeholder="e.g. I had a bowl of oatmeal with banana and a cup of coffee"
                className={recording ? 'note-textarea--recording' : ''}
              />
            </div>

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

        {error ? (
          <div className="analyzer-error-row">
            <p className="error-text">{error}</p>
            {mode === 'photo' && selectedFile && !uploading ? (
              <button type="button" className="analyzer-retry-btn" onClick={startPhotoAnalysis}>
                Try again
              </button>
            ) : null}
            {mode === 'voice' && transcript.trim() && !analyzing ? (
              <button type="button" className="analyzer-retry-btn" onClick={startVoiceAnalysis}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
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

            <p className="subtle-text">{getConfidenceMessage(draft.confidence || 0)}</p>

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
              <button
                type="button"
                className="library-save-from-draft-btn"
                onClick={() => {
                  const items = draft.items.map(item => ({
                    name: item.name,
                    estimatedPortion: item.estimatedPortion,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    fiber: item.fiber,
                  }))
                  setPendingLibrarySave({ name: '', items })
                  switchMode('library')
                }}
              >
                Save to library
              </button>
              <button type="button" className="voice-discard-btn" onClick={() => { setDraft(null); setTranscript('') }}>
                Discard
              </button>
            </div>
          </>
        ) : null}

        {/* Library mode */}
        {mode === 'library' && !draft ? (
          <FoodLibraryTab
            onLogged={() => {
              setSuccessMessage('Logged from library')
              setTimeout(() => setSuccessMessage(''), 2500)
            }}
            initialSave={pendingLibrarySave}
            onInitialSaveDone={() => setPendingLibrarySave(null)}
          />
        ) : null}

        {/* Barcode mode */}
        {mode === 'barcode' && !draft ? (
          <BarcodeScannerMode
            onAdded={() => {
              setSuccessMessage('Added to today')
              setTimeout(() => setSuccessMessage(''), 2500)
              switchMode('photo')
              onConfirmed?.()
            }}
            onCancel={() => switchMode('photo')}
          />
        ) : null}

      </section>
    </section>
  )
}
