import { useEffect, useRef, useState } from 'react'
import { hapticLight } from '../../../shared/lib/haptic'

function browserTz(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { return null }
}

/**
 * Tiny play/stop button that streams a ~30-second TTS summary from the
 * coach. The audio is generated server-side on demand and not cached
 * client-side beyond the lifetime of the blob URL.
 */
export function VoiceSummaryButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  async function toggle() {
    hapticLight()
    if (state === 'playing' && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setState('idle')
      return
    }
    if (state === 'loading') return

    setState('loading')
    try {
      const tz = browserTz()
      const qs = tz ? `?tz=${encodeURIComponent(tz)}` : ''
      const res = await fetch(`/api/coach/voice-summary${qs}`, {
        credentials: 'include',
        headers: { Accept: 'audio/mpeg' },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        // eslint-disable-next-line no-console
        console.warn('voice summary failed', res.status, text)
        setState('error')
        setTimeout(() => setState('idle'), 1500)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio
      audio.addEventListener('ended', () => setState('idle'))
      audio.addEventListener('error', () => setState('error'))
      await audio.play()
      setState('playing')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 1500)
    }
  }

  const ariaLabel =
    state === 'playing' ? 'Stop voice summary' :
    state === 'loading' ? 'Loading voice summary' :
    state === 'error'   ? 'Voice summary failed' :
    'Play voice summary'

  return (
    <button
      type="button"
      className={`coach-card__refresh coach-card__voice coach-card__voice--${state}`}
      onClick={toggle}
      disabled={state === 'loading'}
      aria-label={ariaLabel}
      title="Listen"
    >
      <VoiceIcon state={state} />
    </button>
  )
}

function VoiceIcon({ state }: { state: 'idle' | 'loading' | 'playing' | 'error' }) {
  // 14×14 viewBox, currentColor so it matches the button text colour.
  if (state === 'loading') {
    return (
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray="20 12">
          <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.9s" repeatCount="indefinite"/>
        </circle>
      </svg>
    )
  }
  if (state === 'playing') {
    // Two vertical bars — a stop affordance that reads cleaner than '⏸'.
    return (
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
        <rect x="3.5" y="3" width="2.2" height="8" rx="0.8" fill="currentColor"/>
        <rect x="8.3" y="3" width="2.2" height="8" rx="0.8" fill="currentColor"/>
      </svg>
    )
  }
  if (state === 'error') {
    return (
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    )
  }
  // idle — a friendly speech-bubble + waveform: more 'spoken word' than 'speaker'.
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
      <path
        d="M2.4 4.4a2 2 0 0 1 2-2h5.2a2 2 0 0 1 2 2v3.4a2 2 0 0 1-2 2H6.6L4.5 11.4a.4.4 0 0 1-.65-.31V9.8H4.4a2 2 0 0 1-2-2z"
        fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      <path d="M5.2 6.4v1M7 5.4v3M8.8 6v1.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )
}
