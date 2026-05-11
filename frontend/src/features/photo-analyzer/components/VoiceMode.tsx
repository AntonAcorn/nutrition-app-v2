import { useEffect, useMemo, useRef, useState } from 'react'
import { MascotSvg } from '../../current-day/components/MascotSvg'
import { getTodayLocalDateInputValue } from '../../../shared/lib/date'
import { apiClient, ApiError } from '../../../shared/lib/apiClient'
import { PaywallSheet } from '../../../shared/components/PaywallSheet'
import { toNumber } from '../../../shared/lib/number'
import { track } from '../../../shared/lib/analytics'
import type { DraftItem, MealTemplateItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { calculateTotals } from '../model/photoAnalysis'
import { analyzeVoice } from '../model/voiceAnalysisApi'
import { isNativePlatform } from '../model/platform'
import { getWebSpeechRecognition, getConfidenceMessage } from '../model/speechRecognition'
import { DraftItemEditor } from './DraftItemEditor'
import { TotalsRow } from './TotalsRow'
import { MicButton } from './MicButton'

interface VoiceModeProps {
  onConfirmed?: () => void
  onSaveToLibrary?: (data: { name: string; items: MealTemplateItem[] }) => void
  slotType?: string
  speechSupported: boolean
  recognitionLang: string
  onRecognitionLangChange: (lang: string) => void
  isNativeRef: React.MutableRefObject<boolean>
  voiceDraft: PhotoAnalysisDraft | null
  onVoiceDraftChange: (draft: PhotoAnalysisDraft | null) => void
}

const LANG_OPTIONS = [
  { code: 'en-US', label: 'EN' },
  { code: 'ru-RU', label: 'RU' },
  { code: 'fr-FR', label: 'FR' },
  { code: 'es-ES', label: 'ES' },
] as const

export function VoiceMode({
  onConfirmed,
  onSaveToLibrary,
  slotType,
  speechSupported,
  recognitionLang,
  onRecognitionLangChange,
  isNativeRef,
  voiceDraft,
  onVoiceDraftChange,
}: VoiceModeProps) {
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [voiceSaving, setVoiceSaving] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [voiceSuccess, setVoiceSuccess] = useState('')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const voiceDraftTotals = useMemo(
    () => (voiceDraft ? calculateTotals(voiceDraft.items) : calculateTotals([])),
    [voiceDraft],
  )

  useEffect(() => {
    return () => { stopRecording() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      } catch {
        void isNativePlatform // keep import used
      }
    } else {
      recognitionRef.current?.stop()
    }
    setRecording(false)
  }

  async function startVoiceAnalysis() {
    if (!transcript.trim()) { setVoiceError('Dictate something first'); return }
    setAnalyzing(true)
    setVoiceError('')
    setVoiceSuccess('')
    try {
      const result = await analyzeVoice(transcript.trim(), navigator.language?.slice(0, 2) || 'en', getTodayLocalDateInputValue())
      track('voice_analyzed', { item_count: result.items.length, confidence: result.confidence })
      onVoiceDraftChange(result)
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywallOpen(true)
      } else {
        setVoiceError(err instanceof Error ? err.message : 'Voice analysis failed')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  function updateVoiceItem(itemId: string, field: keyof DraftItem, value: string) {
    if (!voiceDraft) return
    onVoiceDraftChange({
      ...voiceDraft,
      items: voiceDraft.items.map(item => {
        if (item.id !== itemId) return item
        if (field === 'name' || field === 'estimatedPortion') return { ...item, [field]: value }
        return { ...item, [field]: toNumber(value) }
      }),
    })
  }

  function updateVoiceNotes(value: string) {
    if (!voiceDraft) return
    onVoiceDraftChange({
      ...voiceDraft,
      notes: value.split('\n').map(line => line.trim()).filter(Boolean),
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
      await apiClient.post(`/api/photo-analysis/drafts/${voiceDraft.id}/confirm`, {
        caloriesKcal: voiceDraftTotals.calories,
        proteinG: voiceDraftTotals.protein,
        fatG: voiceDraftTotals.fat,
        fiberG: voiceDraftTotals.fiber,
        carbsG: voiceDraftTotals.carbs,
        notes: voiceDraft.notes.join('\n'),
        mealName,
        slotType,
      })
      track('draft_confirmed', { method: 'voice' })
      onVoiceDraftChange({ ...voiceDraft, needsUserConfirmation: false })
      setVoiceSuccess('Saved. Daily summary updated.')
      onConfirmed?.()
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setVoiceSaving(false)
    }
  }

  if (voiceDraft) {
    return (
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
                ({ name, estimatedPortion, calories, protein, carbs, fat, fiber }))
              onSaveToLibrary?.({ name: '', items })
              onVoiceDraftChange(null)
              setTranscript('')
            }}
          >
            Save to library
          </button>
          <button
            type="button"
            className="voice-discard-btn"
            onClick={() => { track('draft_discarded', { method: 'voice' }); onVoiceDraftChange(null); setTranscript('') }}
          >
            Discard
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="voice-hero">
      <MascotSvg mood="happy" size={100} className="voice-hero__mascot" />
      <h2 className="voice-hero__title">Describe your meal</h2>
      <p className="voice-hero__hint">Speak or type what you ate</p>

      <div className="upload-panel__note voice-hero__input">
        <div className="note-label-row">
          <span>Your meal</span>
          {speechSupported && (
            <div className="note-mic-controls">
              <div className="voice-lang-picker">
                {LANG_OPTIONS.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    className={`voice-lang-btn ${recognitionLang === code ? 'voice-lang-btn--active' : ''}`}
                    onClick={() => onRecognitionLangChange(code)}
                    disabled={recording}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <MicButton
                active={recording}
                onClick={recording ? stopRecording : startRecording}
                ariaLabelStart="Start recording"
                ariaLabelStop="Stop recording"
              />
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
      <PaywallSheet open={paywallOpen} trigger="voice" onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
