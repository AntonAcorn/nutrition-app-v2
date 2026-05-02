import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { API_BASE } from '../../../shared/lib/apiBase'
import { toNumber } from '../../../shared/lib/number'
import type { DraftItem, MealTemplateItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'
import { analyzeVoice } from '../model/voiceAnalysisApi'
import { BarcodeScannerMode } from '../../barcode/components/BarcodeScannerMode'
import { PhotoDraftCard } from './PhotoDraftCard'
import type { DraftEntry } from './PhotoDraftCard'

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
  onSaveToLibrary?: (data: { name: string; items: MealTemplateItem[] }) => void
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

type AnalyzerMode = 'photo' | 'voice' | 'barcode'

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

export function PhotoAnalyzerTab({ onConfirmed, onSaveToLibrary }: PhotoAnalyzerTabProps) {
  const [mode, setMode] = useState<AnalyzerMode>('photo')

  // Photo mode: multi-draft queue
  const [photoDrafts, setPhotoDrafts] = useState<DraftEntry[]>([])

  // Voice mode: single draft (full review)
  const [voiceDraft, setVoiceDraft] = useState<PhotoAnalysisDraft | null>(null)
  const [voiceSaving, setVoiceSaving] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [voiceSuccess, setVoiceSuccess] = useState('')

  // Photo note input
  const [userNote, setUserNote] = useState('')

  // Voice mode state
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [recognitionLang, setRecognitionLang] = useState('en-US')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isNativeRef = useRef<boolean>(false)

  const [noteRecording, setNoteRecording] = useState(false)
  const noteRecognitionRef = useRef<SpeechRecognition | null>(null)
  const noteBaseRef = useRef<string>('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  const voiceDraftTotals = useMemo(
    () => (voiceDraft ? calculateTotals(voiceDraft.items) : calculateTotals([])),
    [voiceDraft],
  )

  useEffect(() => {
    async function checkSpeech() {
      const native = await nativeSpeechAvailable()
      if (native) {
        isNativeRef.current = true
        setSpeechSupported(true)
      } else {
        const onNative = await isNativePlatform()
        isNativeRef.current = onNative
        setSpeechSupported(!onNative && getWebSpeechRecognition() !== null)
      }
    }
    checkSpeech()
    return () => { stopRecording() }
  }, [])

  function switchMode(next: AnalyzerMode) {
    stopRecording()
    setMode(next)
    setVoiceDraft(null)
    setVoiceError('')
    setVoiceSuccess('')
    setRecording(false)
    // photoDrafts intentionally NOT cleared on mode switch
  }

  // ── Photo mode ──────────────────────────────────────────────────────────

  async function analyzePhoto(file: File, note: string) {
    const thumbnail = URL.createObjectURL(file)
    const localId = crypto.randomUUID()

    setPhotoDrafts(prev => [...prev, {
      localId,
      thumbnail,
      status: 'analyzing',
      draft: null,
      saveError: '',
      analyzeError: '',
      expanded: false,
    }])

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entryDate', currentEntryDate())
      formData.append('userNote', note)
      formData.append('locale', 'en')
      const response = await fetch(`${API_BASE}/api/photo-analysis/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!response.ok) throw new Error(`Analysis failed (${response.status})`)
      const payload = await response.json()
      const draft = normalizeDraft(payload.draft)
      setPhotoDrafts(prev => prev.map(e =>
        e.localId === localId ? { ...e, status: 'idle', draft } : e,
      ))
    } catch (err) {
      setPhotoDrafts(prev => prev.map(e =>
        e.localId === localId
          ? { ...e, status: 'error', analyzeError: err instanceof Error ? err.message : 'Analysis failed' }
          : e,
      ))
    }
  }

  async function handleTakePhoto() {
    if (await isNativePlatform()) {
      const file = await pickPhotoNative()
      if (file) {
        const note = userNote
        setUserNote('')
        analyzePhoto(file, note)
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const note = userNote
    setUserNote('')
    files.forEach(file => analyzePhoto(file, note))
    if (event.target) event.target.value = ''
  }

  async function savePhotoDraft(localId: string) {
    const entry = photoDrafts.find(e => e.localId === localId)
    if (!entry?.draft) return

    setPhotoDrafts(prev => prev.map(e =>
      e.localId === localId ? { ...e, status: 'saving', saveError: '' } : e,
    ))

    const draft = entry.draft
    const totals = calculateTotals(draft.items)
    const rawName = draft.items.length > 0
      ? draft.items.slice(0, 2).map(i => i.name).join(', ')
      : 'Analyzed meal'
    const mealName = rawName.length > 50 ? rawName.slice(0, 47) + '...' : rawName

    try {
      const response = await fetch(`${API_BASE}/api/photo-analysis/drafts/${draft.id}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caloriesKcal: totals.calories,
          proteinG: totals.protein,
          fatG: totals.fat,
          fiberG: totals.fiber,
          carbsG: totals.carbs,
          notes: draft.notes.join('\n'),
          mealName,
        }),
      })
      if (!response.ok) throw new Error(`Save failed (${response.status})`)

      setPhotoDrafts(prev => prev.map(e =>
        e.localId === localId ? { ...e, status: 'saved' } : e,
      ))
      setTimeout(() => {
        setPhotoDrafts(prev => {
          const e = prev.find(x => x.localId === localId)
          if (e?.thumbnail) URL.revokeObjectURL(e.thumbnail)
          return prev.filter(x => x.localId !== localId)
        })
      }, 1200)
      onConfirmed?.()
    } catch (err) {
      setPhotoDrafts(prev => prev.map(e =>
        e.localId === localId
          ? { ...e, status: 'idle', saveError: err instanceof Error ? err.message : 'Save failed' }
          : e,
      ))
    }
  }

  function saveAllPhotoDrafts() {
    photoDrafts.filter(e => e.status === 'idle').forEach(e => savePhotoDraft(e.localId))
  }

  function savePhotoDraftToLibrary(localId: string) {
    const entry = photoDrafts.find(e => e.localId === localId)
    if (!entry?.draft) return
    const items = entry.draft.items.map(({ name, estimatedPortion, calories, protein, fat, carbs, fiber }) =>
      ({ name, estimatedPortion, calories, protein, fat, carbs, fiber })
    )
    const rawName = entry.draft.items.length > 0
      ? entry.draft.items.slice(0, 2).map(i => i.name).join(', ')
      : ''
    onSaveToLibrary?.({ name: rawName.length > 50 ? rawName.slice(0, 47) + '...' : rawName, items })
  }

  function discardPhotoDraft(localId: string) {
    setPhotoDrafts(prev => {
      const e = prev.find(x => x.localId === localId)
      if (e?.thumbnail) URL.revokeObjectURL(e.thumbnail)
      return prev.filter(x => x.localId !== localId)
    })
  }

  function toggleExpand(localId: string) {
    setPhotoDrafts(prev => prev.map(e =>
      e.localId === localId ? { ...e, expanded: !e.expanded } : e,
    ))
  }

  function updatePhotoDraftItem(localId: string, itemId: string, field: keyof DraftItem, value: string) {
    setPhotoDrafts(prev => prev.map(e => {
      if (e.localId !== localId || !e.draft) return e
      return {
        ...e,
        draft: {
          ...e.draft,
          items: e.draft.items.map(item => {
            if (item.id !== itemId) return item
            if (field === 'name' || field === 'estimatedPortion') return { ...item, [field]: value }
            return { ...item, [field]: toNumber(value) }
          }),
        },
      }
    }))
  }

  function updatePhotoDraftNotes(localId: string, value: string) {
    setPhotoDrafts(prev => prev.map(e => {
      if (e.localId !== localId || !e.draft) return e
      return {
        ...e,
        draft: {
          ...e.draft,
          notes: value.split('\n').map(line => line.trim()).filter(Boolean),
        },
      }
    }))
  }

  // ── Voice mode ──────────────────────────────────────────────────────────

  async function startRecording() {
    setVoiceError('')
    try {
      if (isNativeRef.current) {
        await startNativeRecording()
      } else {
        startWebRecording()
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not start recording')
    }
  }

  async function startNativeRecording() {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      const perm = await SpeechRecognition.requestPermissions()
      if (perm.speechRecognition !== 'granted' || perm.microphone !== 'granted') {
        setVoiceError('Microphone permission is required')
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
      setVoiceError(err instanceof Error ? err.message : 'Could not start recording')
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
        setVoiceError(`Microphone error: ${event.error}`)
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
        setVoiceError(`Microphone error: ${event.error}`)
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
    if (!transcript.trim()) { setVoiceError('Dictate something first'); return }
    setAnalyzing(true)
    setVoiceError('')
    setVoiceSuccess('')
    try {
      const result = await analyzeVoice(transcript.trim(), navigator.language?.slice(0, 2) || 'en', currentEntryDate())
      setVoiceDraft(result)
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Voice analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Voice draft editing ──────────────────────────────────────────────────

  function updateVoiceItem(itemId: string, field: keyof DraftItem, value: string) {
    setVoiceDraft(current => {
      if (!current) return current
      return {
        ...current,
        items: current.items.map(item => {
          if (item.id !== itemId) return item
          if (field === 'name' || field === 'estimatedPortion') return { ...item, [field]: value }
          return { ...item, [field]: toNumber(value) }
        }),
      }
    })
  }

  function updateVoiceNotes(value: string) {
    setVoiceDraft(current => {
      if (!current) return current
      return {
        ...current,
        notes: value.split('\n').map(line => line.trim()).filter(Boolean),
      }
    })
  }

  async function saveVoiceDraft() {
    if (!voiceDraft) return
    setVoiceSaving(true)
    setVoiceError('')
    setVoiceSuccess('')
    const rawName = voiceDraft.items.length > 0
      ? voiceDraft.items.slice(0, 2).map(i => i.name).join(', ')
      : 'Analyzed meal'
    const mealName = rawName.length > 50 ? rawName.slice(0, 47) + '...' : rawName
    try {
      const response = await fetch(`${API_BASE}/api/photo-analysis/drafts/${voiceDraft.id}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caloriesKcal: voiceDraftTotals.calories,
          proteinG: voiceDraftTotals.protein,
          fatG: voiceDraftTotals.fat,
          fiberG: voiceDraftTotals.fiber,
          carbsG: voiceDraftTotals.carbs,
          notes: voiceDraft.notes.join('\n'),
          mealName,
        }),
      })
      if (!response.ok) throw new Error(`Failed to save (${response.status})`)
      await response.json()
      setVoiceDraft(current => (current ? { ...current, needsUserConfirmation: false } : current))
      setVoiceSuccess('Saved. Daily summary updated.')
      onConfirmed?.()
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setVoiceSaving(false)
    }
  }

  const idleCount = photoDrafts.filter(e => e.status === 'idle').length

  return (
    <section className="screen-section screen-section--photo-dark">
      <section className="panel analyzer-panel analyzer-panel--dark">

        {/* Mode toggle — hidden when voice draft is active */}
        {!voiceDraft ? (
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
              className={`analyzer-mode-btn ${mode === 'barcode' ? 'analyzer-mode-btn--active' : ''}`}
              onClick={() => switchMode('barcode')}
            >
              Barcode
            </button>
          </div>
        ) : null}

        {/* ── Photo mode ── */}
        {mode === 'photo' && !voiceDraft ? (
          <>
            {/* Note input */}
            <div className="upload-panel__note photo-upload-hero__note">
              <div className="note-label-row">
                <span>{photoDrafts.length > 0 ? 'Note for next photo' : 'Optional note'}</span>
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
                onChange={(e) => setUserNote(e.target.value)}
                rows={photoDrafts.length > 0 ? 1 : 2}
                placeholder="e.g. chicken, rice, salad"
                className={noteRecording ? 'note-textarea--recording' : ''}
              />
            </div>

            {/* Upload buttons */}
            <div className="upload-button-group">
              <button type="button" className="upload-button" onClick={handleTakePhoto}>
                <span>{photoDrafts.length > 0 ? 'Add another photo' : 'Take photo'}</span>
              </button>
              <label className="upload-button upload-button--secondary">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  hidden
                />
                <span>Choose from gallery</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFilesSelected}
                hidden
              />
            </div>

            {/* Mascot hero — only when no drafts yet */}
            {photoDrafts.length === 0 && (
              <div className="photo-upload-hero">
                <img src="/mascot/camera.png" alt="" className="photo-upload-hero__mascot" />
                <h2 className="photo-upload-hero__title">Take a photo of your meal</h2>
              </div>
            )}

            {/* Draft cards queue */}
            {photoDrafts.length > 0 && (
              <div className="photo-draft-queue">
                {photoDrafts.map(entry => (
                  <PhotoDraftCard
                    key={entry.localId}
                    entry={entry}
                    onSave={savePhotoDraft}
                    onDiscard={discardPhotoDraft}
                    onToggleExpand={toggleExpand}
                    onUpdateItem={updatePhotoDraftItem}
                    onUpdateNotes={updatePhotoDraftNotes}
                    onSaveToLibrary={onSaveToLibrary ? savePhotoDraftToLibrary : undefined}
                  />
                ))}

                {idleCount >= 2 && (
                  <button
                    type="button"
                    className="photo-draft-save-all-btn"
                    onClick={saveAllPhotoDrafts}
                  >
                    Save all {idleCount} meals
                  </button>
                )}
              </div>
            )}
          </>
        ) : null}

        {/* ── Voice mode ── */}
        {mode === 'voice' && !voiceDraft ? (
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

            {voiceError && <p className="error-text">{voiceError}</p>}
          </div>
        ) : null}

        {/* ── Voice draft review (full screen) ── */}
        {voiceDraft ? (
          <>
            <div className="analyzer-panel__header">
              <div>
                <p className="screen-header__meta">Meal draft</p>
                <h3>Check it, fix anything, and save</h3>
              </div>
              <div className="status-badge">
                <span className={`status-dot ${voiceDraft.needsUserConfirmation ? '' : 'status-dot--done'}`} />
                <span>{voiceDraft.needsUserConfirmation ? 'Needs confirmation' : 'Confirmed'}</span>
              </div>
            </div>

            <p className="subtle-text">{getConfidenceMessage(voiceDraft.confidence || 0)}</p>

            <TotalsRow totals={voiceDraftTotals} />

            <div className="draft-items-list">
              {voiceDraft.items.map(item => (
                <DraftItemEditor key={item.id} item={item} onChange={updateVoiceItem} />
              ))}
            </div>

            <div className="notes-block">
              <label>
                Notes
                <textarea value={voiceDraft.notes.join('\n')} onChange={(e) => updateVoiceNotes(e.target.value)} rows={4} />
              </label>
            </div>

            {voiceError && <p className="error-text">{voiceError}</p>}
            {voiceSuccess && <p className="success-text">{voiceSuccess}</p>}

            <div className="primary-actions">
              <button type="button" onClick={saveVoiceDraft} disabled={voiceSaving}>
                {voiceSaving ? 'Saving...' : 'Save meal'}
              </button>
              <button
                type="button"
                className="library-save-from-draft-btn"
                onClick={() => {
                  const items = voiceDraft.items.map(({ name, estimatedPortion, calories, protein, carbs, fat, fiber }) =>
                    ({ name, estimatedPortion, calories, protein, carbs, fat, fiber })
                  )
                  onSaveToLibrary?.({ name: '', items })
                  setVoiceDraft(null)
                  setTranscript('')
                }}
              >
                Save to library
              </button>
              <button
                type="button"
                className="voice-discard-btn"
                onClick={() => { setVoiceDraft(null); setTranscript('') }}
              >
                Discard
              </button>
            </div>
          </>
        ) : null}

        {/* ── Barcode mode ── */}
        {mode === 'barcode' && !voiceDraft ? (
          <BarcodeScannerMode
            onAdded={() => {
              setVoiceSuccess('Added to today')
              setTimeout(() => setVoiceSuccess(''), 2500)
              switchMode('photo')
              onConfirmed?.()
            }}
            onCancel={() => switchMode('photo')}
          />
        ) : null}

        {/* General success message (barcode/library) */}
        {voiceSuccess && mode !== 'voice' && !voiceDraft && (
          <p className="success-text">{voiceSuccess}</p>
        )}

      </section>
    </section>
  )
}
