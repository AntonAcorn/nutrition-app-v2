import { useEffect } from 'react'

interface AboutRumblySheetProps {
  onClose: () => void
}

const WEBSITE_URL = 'https://rumblyeats.org/about'

/**
 * "Behind Rumbly" sheet — honest one-line story about who's behind the app
 * and a neutral link to the website. Kept Apple-safe by:
 *   - not using the words "donate", "tip", "support" on any in-app button,
 *   - linking to the main site (not a payment page),
 *   - opening the URL through window.open which Capacitor routes to Safari
 *     (not an in-app webview), so Apple sees an external system link.
 *
 * The actual /support page on the website hosts the Ko-fi widget — that's
 * outside the app's jurisdiction.
 */
export function AboutRumblySheet({ onClose }: AboutRumblySheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function openWebsite() {
    window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="about-sheet-backdrop" onClick={onClose}>
      <div
        className="about-sheet"
        role="dialog"
        aria-label="Behind Rumbly"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="about-sheet__close" onClick={onClose} aria-label="Close">✕</button>

        <header className="about-sheet__header">
          <span className="about-sheet__emoji" aria-hidden>💛</span>
          <h2>Behind Rumbly</h2>
        </header>

        <div className="about-sheet__body">
          <p>
            Rumbly is built by one person in Canada. No team, no investors —
            just someone who wanted a food log that doesn't shame you.
          </p>
          <p>
            Every photo and voice log uses AI, which costs real money per
            request. The daily limit keeps the app sustainable on a personal
            budget so it can stay free for everyone.
          </p>
          <p>
            If Rumbly helps you, you can read more on the website. Features
            stay the same for everyone — there's no in-app upgrade.
          </p>
        </div>

        <button
          type="button"
          className="about-sheet__cta"
          onClick={openWebsite}
        >
          Read more on rumblyeats.org →
        </button>
      </div>
    </div>
  )
}
