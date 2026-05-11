import { useEffect } from 'react'
import { useEntitlement, useInvalidateEntitlement } from '../model/useEntitlement'
import { trialDaysRemaining } from '../model/entitlementApi'

interface Props {
  open: boolean
  trigger: 'photo' | 'voice' | 'coach' | 'manual'
  onClose: () => void
}

const triggerCopy: Record<Props['trigger'], { title: string; body: string }> = {
  photo: {
    title: 'You used today\'s free photo',
    body: 'Free tier includes 1 photo + 1 voice log per day. Go unlimited with Pro — or come back tomorrow.',
  },
  voice: {
    title: 'You used today\'s free voice log',
    body: 'Free tier includes 1 photo + 1 voice log per day. Go unlimited with Pro — or come back tomorrow.',
  },
  coach: {
    title: 'Coach Insights are Pro',
    body: 'Weekly patterns, adaptive goals, and the What-If simulator come with Pro.',
  },
  manual: {
    title: 'Unlock Rumbly Pro',
    body: 'Unlimited AI logging, Coach Insights, and unlimited Relax Days.',
  },
}

/**
 * Open-beta copy — shown when paywall is disabled server-side but the user
 * still hit a daily AI quota. No plans, no upgrade pitch, just an honest
 * "see you tomorrow" message.
 */
const openBetaCopy: Record<Props['trigger'], { title: string; body: string }> = {
  photo: {
    title: 'Daily AI photo limit reached',
    body: 'Rumbly is free during open beta with a daily AI cap to keep server costs sustainable. Try a manual log now — or come back tomorrow for more AI.',
  },
  voice: {
    title: 'Daily AI voice limit reached',
    body: 'Rumbly is free during open beta with a daily AI cap to keep server costs sustainable. Try a manual log now — or come back tomorrow for more AI.',
  },
  coach: {
    title: 'Coach is taking a break',
    body: 'Coach Insights are free during open beta but capped to keep things sustainable. Check back tomorrow.',
  },
  manual: {
    title: 'You\'re on open beta',
    body: 'Rumbly is free with a daily AI cap. There\'s no upgrade right now — just enjoy the app.',
  },
}

export function PaywallSheet({ open, trigger, onClose }: Props) {
  const { data: entitlement } = useEntitlement()
  const invalidate = useInvalidateEntitlement()

  useEffect(() => {
    if (open) invalidate()
  }, [open, invalidate])

  if (!open) return null

  // Open-beta detection: server reports PRO tier with a finite quota.
  // (When paywall is active, PRO users have unlimited=true; when paywall is
  // off, everyone is reported as PRO with a cap, so this branch triggers.)
  const isOpenBeta = entitlement?.tier === 'PRO'
    && entitlement.photoQuota.unlimited === false

  if (isOpenBeta) {
    const copy = openBetaCopy[trigger]
    const cap = trigger === 'voice' ? entitlement!.voiceQuota.cap : entitlement!.photoQuota.cap
    return (
      <div className="paywall-backdrop" onClick={onClose}>
        <div className="paywall-sheet" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="paywall-sheet__close" onClick={onClose} aria-label="Close">✕</button>

          <p className="paywall-sheet__eyebrow">Open beta · {cap}/day</p>
          <h2 className="paywall-sheet__title">{copy.title}</h2>
          <p className="paywall-sheet__body">{copy.body}</p>

          <button type="button" className="paywall-sheet__free-fallback" onClick={onClose}>
            Got it, see you tomorrow
          </button>
        </div>
      </div>
    )
  }

  const copy = triggerCopy[trigger]
  const trialDays = trialDaysRemaining(entitlement)
  const foundersLeft = entitlement?.foundersRemaining ?? 0

  return (
    <div className="paywall-backdrop" onClick={onClose}>
      <div className="paywall-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="paywall-sheet__close" onClick={onClose} aria-label="Close">✕</button>

        <p className="paywall-sheet__eyebrow">Rumbly Pro</p>
        <h2 className="paywall-sheet__title">{copy.title}</h2>
        <p className="paywall-sheet__body">{copy.body}</p>

        {trialDays !== null && trialDays > 0 && (
          <p className="paywall-sheet__trial-info">
            ⏳ {trialDays} {trialDays === 1 ? 'day' : 'days'} left on your free trial
          </p>
        )}

        <div className="paywall-sheet__plans">
          <button type="button" className="paywall-plan paywall-plan--primary" disabled>
            <div className="paywall-plan__top">
              <span className="paywall-plan__name">Pro yearly</span>
              <span className="paywall-plan__badge">Best value</span>
            </div>
            <div className="paywall-plan__price">$39.99/year</div>
            <div className="paywall-plan__sub">≈ $3.33/month · 7-day free trial</div>
            <div className="paywall-plan__cta">Coming soon</div>
          </button>

          <button type="button" className="paywall-plan" disabled>
            <div className="paywall-plan__top">
              <span className="paywall-plan__name">Pro monthly</span>
            </div>
            <div className="paywall-plan__price">$5.99/month</div>
            <div className="paywall-plan__cta">Coming soon</div>
          </button>

          {foundersLeft > 0 && (
            <button type="button" className="paywall-plan paywall-plan--founder" disabled>
              <div className="paywall-plan__top">
                <span className="paywall-plan__name">🏆 Founder Lifetime</span>
                <span className="paywall-plan__badge paywall-plan__badge--founder">{foundersLeft} left</span>
              </div>
              <div className="paywall-plan__price">$79.99 once</div>
              <div className="paywall-plan__sub">Locked in forever — no subscription</div>
              <div className="paywall-plan__cta">Coming soon</div>
            </button>
          )}
        </div>

        <button type="button" className="paywall-sheet__free-fallback" onClick={onClose}>
          Continue with free — that's totally fine
        </button>
      </div>
    </div>
  )
}
