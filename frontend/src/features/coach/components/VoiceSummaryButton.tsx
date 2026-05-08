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

  const icon = state === 'loading' ? '⏳'
    : state === 'playing' ? '⏸'
    : state === 'error' ? '✕'
    : '🔊'

  return (
    <button
      type="button"
      className="coach-card__refresh coach-card__voice"
      onClick={toggle}
      disabled={state === 'loading'}
      aria-label={state === 'playing' ? 'Stop voice summary' : 'Play voice summary'}
      title="Listen"
    >
      {icon}
    </button>
  )
}
