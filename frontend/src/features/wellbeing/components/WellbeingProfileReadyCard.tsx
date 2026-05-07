import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getWellbeingInsights } from '../model/wellbeingApi'

const SEEN_KEY = 'wellbeing-profile-seen'

export function WellbeingProfileReadyCard() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(SEEN_KEY) } catch { return false }
  })

  const { data } = useQuery({
    queryKey: ['wellbeing-insights'],
    queryFn: getWellbeingInsights,
    staleTime: 5 * 60_000,
    enabled: !dismissed,
  })

  if (dismissed || !data?.enoughData) return null

  function open() {
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    setDismissed(true)
    navigate('/stats')
  }

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    setDismissed(true)
  }

  return (
    <div className="wellbeing-profile-card">
      <span className="wellbeing-profile-card__icon">⚡</span>
      <div className="wellbeing-profile-card__content">
        <p className="wellbeing-profile-card__title">Your energy profile is ready</p>
        <button type="button" className="wellbeing-profile-card__cta" onClick={open}>
          See which foods work for you →
        </button>
      </div>
      <button type="button" className="wellbeing-profile-card__close" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}
