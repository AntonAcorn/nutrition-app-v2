import { useEffect, useRef, useState } from 'react'
import type { MealTemplateItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { track } from '../../../shared/lib/analytics'
import { isNativePlatform } from '../model/platform'
import { nativeSpeechAvailable, getWebSpeechRecognition } from '../model/speechRecognition'
import { BarcodeScannerMode } from '../../barcode/components/BarcodeScannerMode'
import { PhotoMode } from './PhotoMode'
import { VoiceMode } from './VoiceMode'

type AnalyzerMode = 'photo' | 'voice' | 'barcode'

interface PhotoAnalyzerTabProps {
  onConfirmed?: () => void
  onSaveToLibrary?: (data: { name: string; items: MealTemplateItem[] }) => void
  initialMode?: AnalyzerMode
  initialPhoto?: File | null
  onBack?: () => void
}

export function PhotoAnalyzerTab({ onConfirmed, onSaveToLibrary, initialMode, initialPhoto, onBack }: PhotoAnalyzerTabProps) {
  const [mode, setMode] = useState<AnalyzerMode>(initialMode ?? 'photo')
  const [voiceDraft, setVoiceDraft] = useState<PhotoAnalysisDraft | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [recognitionLang, setRecognitionLang] = useState(() => {
    const lang = typeof navigator !== 'undefined' ? (navigator.language?.slice(0, 2) ?? 'en') : 'en'
    const map: Record<string, string> = { en: 'en-US', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES' }
    return map[lang] ?? 'en-US'
  })
  const [voiceError, setVoiceError] = useState('')
  const [barcodeSuccess, setBarcodeSuccess] = useState('')
  const isNativeRef = useRef<boolean>(false)

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
  }, [])

  function switchMode(next: AnalyzerMode) {
    setMode(next)
    setVoiceDraft(null)
  }

  return (
    <section className="screen-section screen-section--photo-dark">
      {onBack && (
        <button type="button" className="analyzer-back-btn" onClick={onBack}>← Back</button>
      )}
      <section className="panel analyzer-panel analyzer-panel--dark">
        {mode === 'photo' && !voiceDraft ? (
          <PhotoMode
            initialPhoto={initialPhoto}
            onConfirmed={onConfirmed}
            onSaveToLibrary={onSaveToLibrary}
            speechSupported={speechSupported}
            recognitionLang={recognitionLang}
            onVoiceError={setVoiceError}
          />
        ) : null}

        {(mode === 'voice' || voiceDraft) ? (
          <VoiceMode
            onConfirmed={onConfirmed}
            onSaveToLibrary={onSaveToLibrary}
            speechSupported={speechSupported}
            recognitionLang={recognitionLang}
            onRecognitionLangChange={setRecognitionLang}
            isNativeRef={isNativeRef}
            voiceDraft={voiceDraft}
            onVoiceDraftChange={setVoiceDraft}
          />
        ) : null}

        {mode === 'barcode' && !voiceDraft ? (
          <BarcodeScannerMode
            onAdded={() => {
              track('barcode_scanned')
              setBarcodeSuccess('Added to today')
              setTimeout(() => setBarcodeSuccess(''), 2500)
              switchMode('photo')
              onConfirmed?.()
            }}
            onCancel={() => switchMode('photo')}
          />
        ) : null}

        {voiceError && mode === 'photo' && <p className="error-text">{voiceError}</p>}
        {barcodeSuccess && mode !== 'voice' && !voiceDraft && (
          <p className="success-text">{barcodeSuccess}</p>
        )}
      </section>
    </section>
  )
}
