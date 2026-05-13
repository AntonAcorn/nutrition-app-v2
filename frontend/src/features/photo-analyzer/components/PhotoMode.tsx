import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { MascotCameraSvg } from '../../current-day/components/MascotCameraSvg'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { apiClient, ApiError } from '../../../shared/lib/apiClient'
import { PaywallSheet } from '../../../shared/components/PaywallSheet'
import { toNumber } from '../../../shared/lib/number'
import { track } from '../../../shared/lib/analytics'
import { compressImage } from '../../../shared/lib/imageCompress'
import type { DraftItem, MealTemplateItem } from '../../../shared/types/nutrition'
import { calculateTotals, normalizeDraft } from '../model/photoAnalysis'
import { isNativePlatform, pickPhotoNative, PhotoPickError } from '../model/platform'
import { getWebSpeechRecognition } from '../model/speechRecognition'
import { PhotoDraftCard, type DraftEntry } from './PhotoDraftCard'
import { MicButton } from './MicButton'

interface PhotoModeProps {
  initialPhoto?: File | null
  onConfirmed?: () => void
  onSaveToLibrary?: (data: { name: string; items: MealTemplateItem[] }) => void
  slotType?: string
  speechSupported: boolean
  recognitionLang: string
  onVoiceError: (msg: string) => void
}

export function PhotoMode({
  initialPhoto,
  onConfirmed,
  onSaveToLibrary,
  slotType,
  speechSupported,
  recognitionLang,
  onVoiceError,
}: PhotoModeProps) {
  const [photoDrafts, setPhotoDrafts] = useState<DraftEntry[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; thumb: string }[]>([])
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [pickError, setPickError] = useState<string>('')
  const [userNote, setUserNote] = useState('')
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [noteRecording, setNoteRecording] = useState(false)
  const noteRecognitionRef = useRef<SpeechRecognition | null>(null)
  const noteBaseRef = useRef<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialPhotoUsed = useRef(false)

  useEffect(() => {
    if (initialPhoto && !initialPhotoUsed.current) {
      initialPhotoUsed.current = true
      // Stage the initial photo for preview + note instead of analyzing
      // it immediately. The user can add a note before tapping Analyze.
      setPendingPhotos([{ file: initialPhoto, thumb: URL.createObjectURL(initialPhoto) }])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Free blob URLs of pending photos when they leave the staging area.
  useEffect(() => {
    return () => {
      pendingPhotos.forEach(p => URL.revokeObjectURL(p.thumb))
    }
  }, [pendingPhotos])

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
      if (err instanceof ApiError && err.status === 402) {
        // Free-tier quota exhausted: drop the in-flight draft card and open paywall.
        setPhotoDrafts(prev => prev.filter(e => e.localId !== localId))
        setPaywallOpen(true)
        return
      }
      setPhotoDrafts(prev => prev.map(e =>
        e.localId === localId
          ? { ...e, status: 'error', analyzeError: err instanceof Error ? err.message : 'Analysis failed' }
          : e,
      ))
    }
  }

  async function handleTakePhoto() {
    setPickError('')
    if (await isNativePlatform()) {
      try {
        const file = await pickPhotoNative()
        if (file) stagePhoto(file)
      } catch (err) {
        const msg = err instanceof PhotoPickError
          ? `Couldn't open the camera: ${err.message}`
          : err instanceof Error
            ? `Camera error: ${err.message}`
            : 'Camera error - try again'
        setPickError(msg)
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    files.forEach(stagePhoto)
    if (event.target) event.target.value = ''
  }

  /** Add a photo to the pre-analyze staging area instead of running it
   *  through the LLM right away. The user gets to optionally add a note
   *  and only then taps "Analyze". */
  function stagePhoto(file: File) {
    setPendingPhotos(prev => [...prev, { file, thumb: URL.createObjectURL(file) }])
  }

  function removePending(index: number) {
    setPendingPhotos(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.thumb)
      return next
    })
  }

  function analyzePending() {
    if (pendingPhotos.length === 0) return
    const note = userNote
    const batch = pendingPhotos
    setPendingPhotos([])
    batch.forEach(({ file }) => analyzePhoto(file, note))
    // Keep the note around so 'Add another photo' below remembers it,
    // but collapse the editor so it doesn't crowd the drafts.
    setNoteExpanded(false)
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
        slotType,
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

  async function saveAllPhotoDrafts() {
    // Run sequentially so each /confirm call sees the daily totals committed
    // by the previous one. Parallel saves used to land in a race where two
    // RMW writers read the same baseline and only the last increment stuck.
    for (const entry of photoDrafts.filter(e => e.status === 'idle')) {
      await savePhotoDraft(entry.localId)
    }
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

  // Pre-analyze staging: photo(s) chosen but not yet sent to the LLM.
  // The user can attach a note here and only then tap Analyze.
  if (pendingPhotos.length > 0) {
    return (
      <div className="photo-staging">
        <div className="photo-staging__topbar">
          <button
            type="button"
            className="photo-staging__back"
            onClick={() => {
              pendingPhotos.forEach(p => URL.revokeObjectURL(p.thumb))
              setPendingPhotos([])
              setUserNote('')
            }}
            aria-label="Discard photos and go back"
          >
            ← Back
          </button>
          <p className="photo-staging__title">
            {pendingPhotos.length === 1 ? 'Ready to analyze' : `${pendingPhotos.length} photos ready`}
          </p>
        </div>

        <div className="photo-staging__thumbs">
          {pendingPhotos.map((p, i) => (
            <div key={p.thumb} className="photo-staging__thumb">
              <img src={p.thumb} alt={`pending ${i + 1}`} />
              <button
                type="button"
                className="photo-staging__remove"
                onClick={() => removePending(i)}
                aria-label="Remove photo"
              >✕</button>
            </div>
          ))}
          <button type="button" className="photo-staging__add" onClick={handleTakePhoto}>+</button>
        </div>

        <div className="photo-staging__note-row">
          <span className="photo-staging__note-label">Note (optional)</span>
          {speechSupported && (
            <MicButton
              active={noteRecording}
              onClick={noteRecording ? stopNoteRecording : startNoteRecording}
              ariaLabelStart="Dictate note"
            />
          )}
        </div>
        <textarea
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          rows={2}
          placeholder="e.g. small portion, no oil, with feta"
          className={`photo-staging__textarea${noteRecording ? ' note-textarea--recording' : ''}`}
        />

        <button type="button" className="photo-staging__analyze" onClick={analyzePending}>
          Analyze {pendingPhotos.length > 1 ? `${pendingPhotos.length} photos` : 'photo'}
        </button>

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
    )
  }

  return (
    <>
      {photoDrafts.length === 0 ? (
        <div className="photo-upload-hero">
          <MascotCameraSvg size={120} className="photo-upload-hero__mascot" />
          <h2 className="photo-upload-hero__title">Take a photo of your meal</h2>
          <p className="photo-upload-hero__sub">Coach will read it for you.</p>
          <button type="button" className="upload-button photo-upload-hero__cta" onClick={handleTakePhoto}>
            <span>📸  Open camera</span>
          </button>
          {pickError && <p className="photo-pick-error" role="alert">{pickError}</p>}
        </div>
      ) : (
        <>
          <button type="button" className="upload-button upload-button--compact" onClick={handleTakePhoto}>
            <span>+ Add another photo</span>
          </button>
          {pickError && <p className="photo-pick-error" role="alert">{pickError}</p>}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFilesSelected}
        hidden
      />

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
      <PaywallSheet open={paywallOpen} trigger="photo" onClose={() => setPaywallOpen(false)} />
    </>
  )
}
