import { ComponentType, LazyExoticComponent, lazy } from 'react'

const RELOAD_FLAG = 'rumbly:stale-chunk-reload'

function isStaleChunkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message || ''
  return (
    msg.includes('Failed to fetch dynamically imported module')
    || msg.includes('Importing a module script failed')
    || msg.includes('error loading dynamically imported module')
    || msg.includes('Loading chunk')
  )
}

// Wraps React.lazy so a stale chunk reference (deploy happened after the SPA
// was loaded → hashed asset is now 404) auto-reloads the page once. The
// sessionStorage flag prevents infinite reload loops if the failure is real.
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err) => {
      if (isStaleChunkError(err) && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw err
    }),
  )
}
