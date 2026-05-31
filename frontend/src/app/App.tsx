import { Suspense, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { SunIcon, MoonIcon } from './icons'
import { AuthShell } from './AuthShell'
import { AppShell } from './AppShell'
import { logout, fetchMe, deleteAccount, type AuthUser } from '../features/auth/model/authApi'
import { identifyUser, resetAnalyticsUser, track } from '../shared/lib/analytics'
import { requestHealthPermissions } from '../shared/lib/healthKit'
import { UNAUTHORIZED_EVENT } from '../shared/lib/apiClient'
import { lazyWithReload } from '../shared/lib/lazyWithReload'

const OnboardingWizard = lazyWithReload(() => import('../features/onboarding/components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })))

type Theme = 'dark' | 'light'

const THEME_KEY = 'nutrition-theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

type Platform = 'ios' | 'android' | 'web'

async function detectPlatform(): Promise<Platform> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.getPlatform() as Platform
  } catch {
    return 'web'
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppInner />
      </HashRouter>
    </QueryClientProvider>
  )
}

function AppInner() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [platform, setPlatform] = useState<Platform>('web')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    detectPlatform().then(setPlatform)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const me = await fetchMe()
        if (!cancelled) {
          setAuthUser(me)
          if (me.authenticated && me.nutritionUserId) {
            identifyUser(me.nutritionUserId)
            Sentry.setUser({ id: me.nutritionUserId, email: me.email ?? undefined })
            requestHealthPermissions()
          }
        }
      } catch {
        if (!cancelled) {
          setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false, emailVerified: false })
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }

    loadSession()
    return () => {
      cancelled = true
    }
  }, [])

  function resetAuthState() {
    setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false, emailVerified: false })
  }

  // Listen for 401 from any API call → drop session
  useEffect(() => {
    function onUnauthorized() {
      resetAnalyticsUser()
      Sentry.setUser(null)
      resetAuthState()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // Universal Links (iOS) / App Links (Android): when the OS hands us an
  // rumblyeats.org URL (email verification or password reset link tapped from
  // Gmail / Mail), Capacitor fires appUrlOpen. We translate it into in-app
  // state so the user never bounces out to the browser.
  useEffect(() => {
    let cleanup: (() => void) | undefined
    async function setup() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return
        const { App: CapApp } = await import('@capacitor/app')
        const listener = await CapApp.addListener('appUrlOpen', async (event) => {
          try {
            const url = new URL(event.url)
            // Email verification: hit the API ourselves so the session in the
            // app is the one that gets the verified flag, then refetch /me.
            if (url.pathname === '/api/auth/verify' && url.searchParams.get('token')) {
              await fetch(url.toString(), { credentials: 'include' }).catch(() => {})
              try {
                const me = await fetchMe()
                setAuthUser(me)
                if (me.authenticated && me.nutritionUserId) {
                  identifyUser(me.nutritionUserId)
                  Sentry.setUser({ id: me.nutritionUserId, email: me.email ?? undefined })
                }
              } catch {}
              return
            }
            // Password reset: surface the token so AuthShell shows the
            // reset-password form. We push it into the URL bar and reload
            // the SPA's URL parsing path.
            const resetToken = url.searchParams.get('reset_token')
            if (resetToken) {
              window.history.replaceState({}, '', `/?reset_token=${encodeURIComponent(resetToken)}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
              return
            }
          } catch {
            // Malformed URL — nothing to do.
          }
        })
        cleanup = () => { listener.remove() }
      } catch {
        // @capacitor/app not available (e.g. running in plain web)
      }
    }
    setup()
    return () => { cleanup?.() }
  }, [])

  async function handleLogout() {
    await logout()
    resetAnalyticsUser()
    Sentry.setUser(null)
    resetAuthState()
  }

  async function handleDeleteAccount() {
    await deleteAccount()
    resetAnalyticsUser()
    Sentry.setUser(null)
    resetAuthState()
  }

  async function handleOnboardingComplete() {
    track('onboarding_completed')
    try {
      const me = await fetchMe()
      setAuthUser(me)
    } catch {
      // session already active, keep current state
    }
  }

  if (authLoading) {
    return (
      <main className="app-shell">
        <section className="screen-section screen-section--home-dark">
          <div className="mascot-hero-card">
            <div className="skeleton skeleton--circle" style={{ width: 100, height: 100, flexShrink: 0 }} />
            <div className="skeleton-col" style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: '1.1rem', width: '60%' }} />
              <div className="skeleton" style={{ height: '0.85rem', width: '40%' }} />
            </div>
          </div>
          <div className="today-dark-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div className="skeleton" style={{ height: '1.1rem', width: '5rem', alignSelf: 'flex-start' }} />
            <div className="skeleton skeleton--circle" style={{ width: 160, height: 160 }} />
            <div className="skeleton" style={{ height: '0.85rem', width: '50%' }} />
          </div>
        </section>
      </main>
    )
  }

  const showAuthShell = !authUser?.authenticated || (authUser?.authenticated && !authUser.emailVerified)

  if (showAuthShell) {
    return (
      <AuthShell
        authUser={authUser}
        platform={platform}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={(user) => setAuthUser(user)}
        onResetUser={() => setAuthUser(null)}
      />
    )
  }

  if (authUser && authUser.authenticated && !authUser.hasProfile) {
    return (
      <main className="app-shell">
        <header className="app-header app-header--dark">
          <div>
            <p className="app-header__eyebrow">Daily nutrition</p>
            <h1>Set up your profile</h1>
          </div>
          <button type="button" className="theme-toggle-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
        <Suspense fallback={null}>
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        </Suspense>
      </main>
    )
  }

  return (
    <AppShell
      authUser={authUser!}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
      onDeleteAccount={handleDeleteAccount}
    />
  )
}
