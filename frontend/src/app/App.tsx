import { FormEvent, lazy, Suspense, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { listTemplates } from '../features/food-library/model/mealTemplateApi'
import { fetchNutritionStatistics } from '../features/statistics/model/statisticsApi'
import { API_BASE } from '../shared/lib/apiBase'
import { MascotSvg } from '../features/current-day/components/MascotSvg'

async function checkNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}


import { GoogleIcon, EyeIcon, EyeOffIcon, SunIcon, MoonIcon, TabIconToday, TabIconStats, TabIconFast, TabIconLibrary, TabIconMe } from './icons'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import { login, logout, register, fetchMe, requestPasswordReset, resetPassword, deleteAccount, resendVerification, loginWithApple, loginWithGoogleNative, EmailNotVerifiedError, type AuthUser } from '../features/auth/model/authApi'

const PhotoAnalyzerTab = lazy(() => import('../features/photo-analyzer/components/PhotoAnalyzerTab').then(m => ({ default: m.PhotoAnalyzerTab })))
const StatisticsTab    = lazy(() => import('../features/statistics/components/StatisticsTab').then(m => ({ default: m.StatisticsTab })))
const OnboardingWizard = lazy(() => import('../features/onboarding/components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })))
const ProfileTab       = lazy(() => import('../features/profile/components/ProfileTab').then(m => ({ default: m.ProfileTab })))
const FoodLibraryTab   = lazy(() => import('../features/food-library/components/FoodLibraryTab').then(m => ({ default: m.FoodLibraryTab })))
const FastingTab       = lazy(() => import('../features/fasting/components/FastingTab').then(m => ({ default: m.FastingTab })))
import type { MealTemplateItem } from '../shared/types/nutrition'
import { identifyUser, resetAnalyticsUser, track } from '../shared/lib/analytics'
import { requestHealthPermissions } from '../shared/lib/healthKit'
import * as Sentry from '@sentry/react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 12) return 'Good morning, future athlete 👀'
  if (hour >= 12 && hour < 17) return 'Good afternoon. Still going? Impressive.'
  if (hour >= 17 && hour < 22) return 'Survived another day. Respect.'
  return 'Still awake? Bold choice.'
}

const tabs = {
  currentDay: 'current-day',
  statistics: 'statistics',
  photoAnalyzer: 'photo-analyzer',
  fasting: 'fasting',
  library: 'library',
  profile: 'profile',
} as const

type TabKey = (typeof tabs)[keyof typeof tabs]
type Theme = 'dark' | 'light'

const THEME_KEY = 'nutrition-theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

function TabLoadingSkeleton() {
  return (
    <section className="screen-section screen-section--home-dark">
      <div className="panel">
        <div className="skeleton" style={{ height: '1rem', width: '40%', marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: '14px' }} />
      </div>
      <div className="panel">
        <div className="skeleton" style={{ height: '3rem', borderRadius: '14px', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: '3rem', borderRadius: '14px' }} />
      </div>
    </section>
  )
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
      <AppInner />
    </QueryClientProvider>
  )
}

function AppInner() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>(tabs.currentDay)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0)
  const [statisticsRefreshToken, setStatisticsRefreshToken] = useState(0)
  const [pendingLibrarySave, setPendingLibrarySave] = useState<{ name: string; items: MealTemplateItem[] } | null>(null)
  const [daySuccessMessage, setDaySuccessMessage] = useState('')
  const [analyzerMode, setAnalyzerMode] = useState<'photo' | 'voice' | 'barcode'>('photo')
  const [initialAnalyzerPhoto, setInitialAnalyzerPhoto] = useState<File | null>(null)
  const [isNative, setIsNative] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | 'check-email'>('login')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authSuccessMessage, setAuthSuccessMessage] = useState('')
  const [resetToken, setResetToken] = useState('')

  useEffect(() => {
    checkNativePlatform().then(setIsNative)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const token = params.get('reset_token')
    if (token) {
      setResetToken(token)
      setAuthMode('reset-password')
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    const googleError = params.get('google_error')
    if (googleError) {
      setAuthError('Google sign-in failed. Please try again.')
      window.history.replaceState({}, '', window.location.pathname)
    }

  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const me = await fetchMe()
        if (!cancelled) {
          setAuthUser(me)
          if (me.authenticated && me.nutritionUserId) {
            identifyUser(me.nutritionUserId, { email: me.email ?? undefined, name: me.displayName ?? undefined })
            Sentry.setUser({ id: me.nutritionUserId, email: me.email ?? undefined })
            requestHealthPermissions()
          }
          if (me.authenticated && !me.emailVerified) {
            setAuthEmail(me.email ?? '')
            setAuthMode('check-email')
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

  function handleDayUpdated() {
    setSummaryRefreshToken((current) => current + 1)
    setStatisticsRefreshToken((current) => current + 1)
  }

  async function handleGoogleSignInNative() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      const nextUser = await loginWithGoogleNative()
      setAuthUser(nextUser)
      if (nextUser.nutritionUserId) {
        identifyUser(nextUser.nutritionUserId, { email: nextUser.email ?? undefined, name: nextUser.displayName ?? undefined })
        Sentry.setUser({ id: nextUser.nutritionUserId, email: nextUser.email ?? undefined })
      }
    } catch (e) {
      if (e instanceof Error && !e.message.includes('canceled')) {
        setAuthError(e instanceof Error ? e.message : 'Google Sign In failed')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleAppleSignIn() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      const nextUser = await loginWithApple()
      setAuthUser(nextUser)
      if (nextUser.nutritionUserId) {
        identifyUser(nextUser.nutritionUserId, { email: nextUser.email ?? undefined, name: nextUser.displayName ?? undefined })
        Sentry.setUser({ id: nextUser.nutritionUserId, email: nextUser.email ?? undefined })
      }
    } catch (e) {
      if (e instanceof Error && !e.message.includes('AuthorizationError error 1001')) {
        setAuthError(e instanceof Error ? e.message : 'Apple Sign In failed')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleAuthSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (authMode === 'register' && authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    setAuthSubmitting(true)
    setAuthError('')

    try {
      if (authMode === 'login') {
        const nextUser = await login({ email: authEmail, password: authPassword })
        setAuthUser(nextUser)
        if (nextUser.nutritionUserId) {
          identifyUser(nextUser.nutritionUserId, { email: nextUser.email ?? undefined, name: nextUser.displayName ?? undefined })
          Sentry.setUser({ id: nextUser.nutritionUserId, email: nextUser.email ?? undefined })
          track('user_logged_in')
        }
        setAuthPassword('')
        setAuthConfirmPassword('')
      } else {
        const nextUser = await register({ email: authEmail, password: authPassword, displayName: authDisplayName })
        setAuthUser(nextUser)
        setAuthMode('check-email')
        setResendSuccess(false)
        setAuthPassword('')
        setAuthConfirmPassword('')
      }
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        setAuthMode('check-email')
        setResendSuccess(false)
      } else {
        setAuthError(error instanceof Error ? error.message : 'Auth failed')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleForgotPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')
    setAuthSuccessMessage('')
    try {
      await requestPasswordReset(authEmail)
      setAuthSuccessMessage('If this email is registered, you will receive a reset link.')
    } catch {
      setAuthError('Something went wrong. Please try again.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleResetPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    setAuthSubmitting(true)
    setAuthError('')
    try {
      await resetPassword(resetToken, authPassword)
      setAuthPassword('')
      setAuthConfirmPassword('')
      setAuthSuccessMessage('Password updated. You can now log in.')
      setAuthMode('login')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Reset failed')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleLogout() {
    await logout()
    resetAnalyticsUser()
    Sentry.setUser(null)
    setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false, emailVerified: false })
    setAuthMode('login')
    setAuthPassword('')
  }

  async function handleDeleteAccount() {
    await deleteAccount()
    resetAnalyticsUser()
    Sentry.setUser(null)
    setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false, emailVerified: false })
    setAuthMode('login')
  }

  async function handleResendVerification() {
    setResendLoading(true)
    setResendSuccess(false)
    try {
      await resendVerification(authEmail || authUser?.email || '')
      setResendSuccess(true)
    } catch {
      // silent — backend never reveals whether email is registered
    } finally {
      setResendLoading(false)
    }
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

  function prefetchForTab(key: TabKey) {
    if (key === tabs.library) {
      qc.prefetchQuery({ queryKey: ['meal-templates'], queryFn: () => listTemplates(), staleTime: 60_000 })
    } else if (key === tabs.statistics) {
      qc.prefetchQuery({ queryKey: ['statistics', 30], queryFn: () => fetchNutritionStatistics(30), staleTime: 60_000 })
    }
  }

  function openAnalyzer(mode: 'photo' | 'voice' | 'barcode') {
    setAnalyzerMode(mode)
    setActiveTab(tabs.photoAnalyzer)
  }

  function openAnalyzerWithPhoto(file: File) {
    setInitialAnalyzerPhoto(file)
    setAnalyzerMode('photo')
    setActiveTab(tabs.photoAnalyzer)
  }

  function handleDraftConfirmed() {
    setInitialAnalyzerPhoto(null)
    setActiveTab(tabs.currentDay)
    handleDayUpdated()
    setDaySuccessMessage('Analysis saved, daily summary is updating.')
  }

  function handleSaveToLibrary(data: { name: string; items: MealTemplateItem[] }) {
    setPendingLibrarySave(data)
    setActiveTab(tabs.library)
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

  const showCheckEmail = authMode === 'check-email' || (authUser?.authenticated && !authUser.emailVerified)

  if (showCheckEmail) {
    const verifyEmail = authEmail || authUser?.email || ''
    return (
      <main className="app-shell app-shell--auth">
        <div className="auth-hero">
          <MascotSvg mood="happy" size={100} className="auth-hero__mascot" />
          <div>
            <p className="auth-hero__eyebrow">Daily nutrition</p>
            <h1 className="auth-hero__title">Check your email</h1>
          </div>
          <button type="button" className="theme-toggle-btn auth-theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <section className="auth-card">
          <div className="auth-form">
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.6 }}>
              We sent a verification link to<br />
              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{verifyEmail}</strong>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.5 }}>
              Click the link to activate your account. Check your spam folder if you don&apos;t see it.
            </p>
            {resendSuccess ? (
              <p className="success-text">Verification email resent. Check your inbox.</p>
            ) : null}
            <button type="button" className="auth-btn-primary" disabled={resendLoading} onClick={handleResendVerification}>
              {resendLoading ? 'Sending...' : 'Resend email'}
            </button>
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                setAuthUser(null)
                setAuthMode('login')
                setResendSuccess(false)
              }}
            >
              ← Back to login
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (authUser?.authenticated && !authUser.hasProfile) {
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

  if (!authUser?.authenticated) {
    const headerTitle = authMode === 'login' ? 'Welcome back'
      : authMode === 'register' ? 'Create account'
      : authMode === 'forgot-password' ? 'Reset password'
      : 'New password'

    return (
      <main className="app-shell app-shell--auth">
        <div className="auth-hero">
          <MascotSvg mood="happy" size={100} className="auth-hero__mascot" />
          <div>
            <p className="auth-hero__eyebrow">Daily nutrition</p>
            <h1 className="auth-hero__title">{headerTitle}</h1>
          </div>
          <button type="button" className="theme-toggle-btn auth-theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <section className="auth-card">
          {authMode === 'forgot-password' ? (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <label className="auth-label">
                Email
                <input
                  className="auth-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              {authSuccessMessage ? <p className="success-text">{authSuccessMessage}</p> : null}
              {authError ? <p className="error-text">{authError}</p> : null}
              <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
                {authSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
              <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMessage('') }}>
                ← Back to login
              </button>
            </form>
          ) : authMode === 'reset-password' ? (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <label className="auth-label">
                New password
                <div className="password-input-wrap">
                  <input
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>
              <label className="auth-label">
                Confirm password
                <div className="password-input-wrap">
                  <input
                    className="auth-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    value={authConfirmPassword}
                    onChange={(event) => setAuthConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)} tabIndex={-1} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>
              {authError ? <p className="error-text">{authError}</p> : null}
              <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
                {authSubmitting ? 'Saving...' : 'Set new password'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' ? (
                <label className="auth-label">
                  Name
                  <input
                    className="auth-input"
                    name="name"
                    autoComplete="name"
                    value={authDisplayName}
                    onChange={(event) => setAuthDisplayName(event.target.value)}
                    placeholder="Anton"
                  />
                </label>
              ) : null}

              <label className="auth-label">
                Email
                <input
                  className="auth-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              <div>
                <div className="auth-password-header">
                  <span className="auth-label-text">Password</span>
                  {authMode === 'login' ? (
                    <button type="button" className="auth-forgot-link" onClick={() => { setAuthMode('forgot-password'); setAuthError(''); setAuthSuccessMessage('') }}>
                      Forgot?
                    </button>
                  ) : null}
                </div>
                <div className="password-input-wrap">
                  <input
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {authMode === 'register' ? (
                <label className="auth-label">
                  Confirm password
                  <div className="password-input-wrap">
                    <input
                      className="auth-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirm-password"
                      autoComplete="new-password"
                      value={authConfirmPassword}
                      onChange={(event) => setAuthConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)} tabIndex={-1} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </label>
              ) : null}

              {authError ? <p className="error-text">{authError}</p> : null}

              {authMode === 'register' ? (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', margin: '0' }}>
                  By creating an account you agree to our{' '}
                  <a href="/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(120,180,255,0.7)' }}>
                    Privacy Policy
                  </a>
                </p>
              ) : null}
              <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
                {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
              </button>

              <div className="auth-divider"><span>or</span></div>

              {isNative && (
                <button type="button" className="auth-apple-btn" onClick={handleAppleSignIn} disabled={authSubmitting}>
                  <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-161.1-139.4c-48.1-90.3-87.5-230-87.5-365.3 0-225.3 146.3-344.8 290.3-344.8 72.6 0 133.2 47.8 177.3 47.8 42.2 0 112.5-51.9 192.8-51.9 30.8 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                  </svg>
                  Sign in with Apple
                </button>
              )}

              {!isNative && (
                <a href={`${API_BASE}/api/auth/google`} className="auth-google-btn">
                  <GoogleIcon />
                  Continue with Google
                </a>
              )}

              {isNative && (
                <button type="button" className="auth-google-btn" onClick={handleGoogleSignInNative} disabled={authSubmitting}>
                  <GoogleIcon />
                  Continue with Google
                </button>
              )}

              <p className="auth-switch-text">
                {authMode === 'login' ? (
                  <>No account?{' '}
                    <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('register'); setAuthError('') }}>
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have one?{' '}
                    <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('login'); setAuthError('') }}>
                      Log in
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header app-header--dark">
        <div>
          <p className="app-header__eyebrow">Daily nutrition</p>
        </div>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <section className="tabs-shell tabs-shell--dark">
        <div className="tabs-body tabs-body--dark">
          <div className="tab-content" key={activeTab}>
            {activeTab === tabs.currentDay ? (
              <CurrentDayTab
                refreshToken={summaryRefreshToken}
                successMessage={daySuccessMessage}
                onDayUpdated={handleDayUpdated}
                displayName={authUser.displayName}
                onOpenAnalyzer={openAnalyzer}
                onOpenAnalyzerWithPhoto={openAnalyzerWithPhoto}
              />
            ) : null}
            <Suspense fallback={<TabLoadingSkeleton />}>
              {activeTab === tabs.statistics ? <StatisticsTab refreshToken={statisticsRefreshToken} /> : null}
              {activeTab === tabs.photoAnalyzer ? (
                <PhotoAnalyzerTab
                  onConfirmed={handleDraftConfirmed}
                  onSaveToLibrary={handleSaveToLibrary}
                  initialMode={analyzerMode}
                  initialPhoto={initialAnalyzerPhoto}
                  onBack={() => { setInitialAnalyzerPhoto(null); setActiveTab(tabs.currentDay) }}
                />
              ) : null}
              {activeTab === tabs.fasting ? <FastingTab /> : null}
              {activeTab === tabs.library ? (
                <FoodLibraryTab
                  onLogged={handleDayUpdated}
                  initialSave={pendingLibrarySave}
                  onInitialSaveDone={() => setPendingLibrarySave(null)}
                />
              ) : null}
              {activeTab === tabs.profile ? (
                <ProfileTab
                  displayName={authUser.displayName}
                  email={authUser.email}
                  onLogout={handleLogout}
                  onDeleteAccount={handleDeleteAccount}
                />
              ) : null}
            </Suspense>
          </div>
        </div>
      </section>

      <nav className="bottom-tab-bar" role="tablist" aria-label="App sections">
        {([
          { key: tabs.currentDay, label: 'Today',   Icon: TabIconToday   },
          { key: tabs.statistics, label: 'Stats',   Icon: TabIconStats   },
          { key: tabs.fasting,    label: 'Fast',    Icon: TabIconFast    },
          { key: tabs.library,    label: 'Library', Icon: TabIconLibrary },
          { key: tabs.profile,    label: 'Me',      Icon: TabIconMe      },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={`bottom-tab-item${activeTab === key ? ' bottom-tab-item--active' : ''}`}
            aria-selected={activeTab === key}
            onTouchStart={() => prefetchForTab(key)}
            onMouseEnter={() => prefetchForTab(key)}
            onClick={() => setActiveTab(key)}
          >
            <Icon />
            <span className="bottom-tab-item__label">{label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}
