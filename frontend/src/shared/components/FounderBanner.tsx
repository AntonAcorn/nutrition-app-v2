import { useState } from 'react'
import { useEntitlement } from '../model/useEntitlement'
import { PaywallSheet } from './PaywallSheet'

/**
 * One-line banner that surfaces the Founder Lifetime countdown on Today.
 *
 * Visible only when:
 *   - the user is not already a Founder/Pro (no point pushing the offer),
 *   - founders remain (clamped server-side), and
 *   - the cap hasn't visibly burned past the "scarcity" threshold (>60% sold
 *     is the sweet spot for FOMO copy; before that we just say "limited").
 */
export function FounderBanner() {
  const { data: e } = useEntitlement()
  const [open, setOpen] = useState(false)

  if (!e) return null
  if (e.tier === 'FOUNDER' || e.tier === 'PRO') return null
  if (e.foundersRemaining <= 0) return null

  const sold = 200 - e.foundersRemaining
  const scarce = sold >= 120 // 60% gone — switch copy to urgency

  return (
    <>
      <button type="button" className="founder-banner" onClick={() => setOpen(true)}>
        <span className="founder-banner__icon">🏆</span>
        <span className="founder-banner__text">
          <span className="founder-banner__title">
            {scarce
              ? `Only ${e.foundersRemaining} Founder spots left`
              : 'Founder Lifetime — $79.99 once, never again'}
          </span>
          <span className="founder-banner__sub">
            {sold}/200 claimed · locked in forever
          </span>
        </span>
        <span className="founder-banner__chevron">›</span>
      </button>
      <PaywallSheet open={open} trigger="manual" onClose={() => setOpen(false)} />
    </>
  )
}
