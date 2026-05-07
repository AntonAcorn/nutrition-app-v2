import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { MascotCameraSvg } from '../../current-day/components/MascotCameraSvg'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { apiClient } from '../../../shared/lib/apiClient'
import { toNumber } from '../../../shared/lib/number'
import { track } from '../../../shared/lib/analytics'
import { compressImage } from '../../../shared/lib/imageCompress'
import type { DraftItem, MealTemplateItem } from '../../../shared/types/nutrition'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'
import { isNativePlatform, pickPhotoNative } from '../model/platform'
import { getWebSpeechRecognition } from '../model/speechRecognition'
import { PhotoDraftCard, type DraftEntry } from './PhotoDraftCard'
import { MicButton } from './MicButton'

interface PhotoModeProps {
  initialPhoto?: File | null
  onConfirmed?: () => void
  onSaveToLibrary?: (data: { name: string; items: MealTemplateItem[] }) => void
  speechSupported: boolean
  recognitionLang: string
  onVoiceError: (msg: string) => void
}

export function PhotoMode({
  initialPhoto,
  onConfirmed,
  onSaveToLibrary,
  speechSupported,
  recognitionLang,
  onVoiceError,
}: PhotoModeProps) {
  const [photoDrafts, setPhotoDrafts] = useState<DraftEntry[]>([])
  const [userNote, setUserNote] = useState('')
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [noteRecording, setNoteRecording] = useState(false)
  const noteRecognitionRef = useRef<SpeechRecognition | null>(null)
  const noteBaseRef = useRef<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const initialPhotoUsed = useRef(false)

  useEffect(() => {
    if (initialPhoto && !initialPhotoUsed.current) {
      initialPhotoUsed.current = true
      analyzePhoto(initialPhoto, '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function analyzePhoto(file: File, note: string) {
    const thumbnail = URL.createObjectURL(file)
    const localId = crypto.randomUUID()

    setPhotoDrafts(prev => [...prev, {
      localId, thumbnail, status: 'analyzing', draft: null,
      saveError: '', analyzeError: '', expanded: false,
    }])

    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('entryDate', getTodayLocalDateInputValue())
      formData.append('userNote', note)
      formData.append('locale', 'en')
      const payload = await apiClient.post<{ draft: Parameters<typeof normalizeDraft>[0] }>('/api/photo-analysis/upload', formData)
      const draft = normalizeDraft(payload.draft)
      track('photo_analyzed', { item_count: draft.items.length, confidence: draft.confidence })
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
      if (file) analyzePhoto(file, userNote)
    } else {
      fileInputRef.current?.click()
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const note = userNote
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
      await apiClient.post(`/api/photo-analysis/drafts/${draft.id}/confirm`, {
        caloriesKcal: totals.calories,
        proteinG: totals.protein,
        fatG: totals.fat,
        fiberG: totals.fiber,
        carbsG: totals.carbs,
        notes: draft.notes.join('\n'),
        mealName,
      })

      track('draft_confirmed', { method: 'photo' })
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
      ({ name, estimatedPortion, calories, protein, fat, carbs, fiber }))
    const rawName = entry.draft.items.length > 0
      ? entry.draft.items.slice(0, 2).map(i => i.name).join(', ')
      : ''
    onSaveToLibrary?.({ name: rawName.length > 50 ? rawName.slice(0, 47) + '...' : rawName, items })
  }

  function discardPhotoDraft(localId: string) {
    track('draft_discarded', { method: 'photo' })
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
        onVoiceError(`Microphone error: ${event.error}`)
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

  const idleDrafts = photoDrafts.filter(e => e.status === 'idle' && e.draft)
  const idleCount = idleDrafts.length

  const allDraftsTotals = useMemo(() => {
    return idleDrafts.reduce(
      (acc, e) => {
        const t = calculateTotals(e.draft!.items)
        acc.calories += t.calories
        acc.protein += t.protein
        acc.fat += t.fat
        acc.carbs += t.carbs
        acc.fiber += t.fiber
        return acc
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    )
  }, [photoDrafts]) // eslint-disable-line react-hooks/exhaustive-deps

  if (initialPhoto && photoDrafts.length === 0) {
    return <p className="subtle-text" style={{ textAlign: 'center', padding: '2rem 0' }}>Analyzing…</p>
  }

  return (
    <>
      {!noteExpanded ? (
        <button type="button" className="add-note-btn" onClick={() => setNoteExpanded(true)}>
          + Add note
        </button>
      ) : (
        <div className="upload-panel__note photo-upload-hero__note">
          <div className="note-label-row">
            <span>{photoDrafts.length > 0 ? 'Note for next photo' : 'Note'}</span>
            <div className="note-mic-controls">
              {speechSupported && (
                <MicButton
                  active={noteRecording}
                  onClick={noteRecording ? stopNoteRecording : startNoteRecording}
                  ariaLabelStart="Dictate note"
                />
              )}
              <button type="button" className="add-note-btn add-note-btn--dismiss" onClick={() => { setNoteExpanded(false); setUserNote('') }}>✕</button>
            </div>
          </div>
          <textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            rows={2}
            placeholder="e.g. chicken, rice, salad"
            className={noteRecording ? 'note-textarea--recording' : ''}
            autoFocus
          />
        </div>
      )}

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

      {photoDrafts.length === 0 && (
        <div className="photo-upload-hero">
          <MascotCameraSvg size={120} className="photo-upload-hero__mascot" />
          <h2 className="photo-upload-hero__title">Take a photo of your meal</h2>
        </div>
      )}

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
            <>
              <div className="photo-draft-totals-summary">
                <p className="photo-draft-totals-summary__label">{idleCount} photos total</p>
                <p className="photo-draft-totals-summary__macros">
                  {Math.round(allDraftsTotals.calories)} kcal
                  <span className="photo-draft-card__sep">·</span>P {Math.round(allDraftsTotals.protein)}g
                  <span className="photo-draft-card__sep">·</span>F {Math.round(allDraftsTotals.fat)}g
                  <span className="photo-draft-card__sep">·</span>C {Math.round(allDraftsTotals.carbs)}g
                </p>
              </div>
              <button
                type="button"
                className="photo-draft-save-all-btn"
                onClick={saveAllPhotoDrafts}
              >
                Save all {idleCount} meals
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
