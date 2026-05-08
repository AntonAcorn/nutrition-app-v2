import { useEffect, useState } from 'react'
import { fetchInlineTip, type InlineTip, type InlineTipTone } from '../model/coachApi'

const TONE_ICON: Record<InlineTipTone, string> = {
  good: '✅',
  caution: '⚠️',
  over: '🚨',
  muted: '',
}

interface Props {
  kcal: number
  slotType?: string
  /**
   * ms to wait after the last change before re-querying. Higher debounce now
   * because the backend may make an LLM call on top of the rule-based pass.
   * The result is cached server-side per kcal-bucket, so repeated tweaks
   * around the same value don't burn tokens.
   */
  debounceMs?: number
}

/**
 * Live "what happens if I add this?" hint shown above the save button in
 * QuickAdd / photo confirm. Refreshes (debounced) as the user types kcal.
 * Hides itself for sub-50 kcal entries (probably not done typing).
 */
export function InlineTipBanner({ kcal, slotType, debounceMs = 700 }: Props) {
  const [tip, setTip] = useState<InlineTip | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(kcal) || kcal < 50) {
      setTip(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const t = window.setTimeout(() => {
      fetchInlineTip(kcal, slotType)
        .then(r => { if (!cancelled) setTip(r) })
        .catch(() => { if (!cancelled) setTip(null) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, debounceMs)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      setLoading(false)
    }
  }, [kcal, slotType, debounceMs])

  if (!tip || tip.tone === 'muted' || !tip.text) return null

  return (
    <div className={`inline-tip inline-tip--${tip.tone}${loading ? ' inline-tip--loading' : ''}`} aria-live="polite">
      <span className="inline-tip__icon" aria-hidden>{TONE_ICON[tip.tone]}</span>
      <span className="inline-tip__text">{tip.text}</span>
    </div>
  )
}
