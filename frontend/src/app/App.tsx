import { FormEvent, useEffect, useState } from 'react'
import { API_BASE } from '../shared/lib/apiBase'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import { login, logout, register, fetchMe, requestPasswordReset, resetPassword, type AuthUser } from '../features/auth/model/authApi'
import { PhotoAnalyzerTab } from '../features/photo-analyzer/components/PhotoAnalyzerTab'
import { StatisticsTab } from '../features/statistics/components/StatisticsTab'
import { OnboardingWizard } from '../features/onboarding/components/OnboardingWizard'
import { ProfileTab } from '../features/profile/components/ProfileTab'

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
  profile: 'profile',
} as const

type TabKey = (typeof tabs)[keyof typeof tabs]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(tabs.currentDay)
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0)
  const [statisticsRefreshToken, setStatisticsRefreshToken] = useState(0)
  const [daySuccessMessage, setDaySuccessMessage] = useState('')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login')
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
    const params = new URLSearchParams(window.location.search)

    const token = params.get('reset_token')
    if (token) {
      setResetToken(token)
      setAuthMode('reset-password')
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    const oauthStatus = params.get('status')
    if (oauthStatus === 'success') {
      window.history.replaceState({}, '', window.location.pathname)
      setAuthLoading(true)
      fetchMe()
        .then(setAuthUser)
        .catch(() => setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false }))
        .finally(() => setAuthLoading(false))
      return
    }
    if (oauthStatus === 'error') {
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
        }
      } catch {
        if (!cancelled) {
          setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false })
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

  async function handleAuthSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (authMode === 'register' && authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    setAuthSubmitting(true)
    setAuthError('')

    try {
      const nextUser = authMode === 'login'
        ? await login({ email: authEmail, password: authPassword })
        : await register({ email: authEmail, password: authPassword, displayName: authDisplayName })

      setAuthUser(nextUser)
      setAuthPassword('')
      setAuthConfirmPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Auth failed')
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
    setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false })
    setAuthPassword('')
  }

  async function handleOnboardingComplete() {
    try {
      const me = await fetchMe()
      setAuthUser(me)
    } catch {
      // session already active, keep current state
    }
  }

  function handleDraftConfirmed() {
    setActiveTab(tabs.currentDay)
    handleDayUpdated()
    setDaySuccessMessage('Analysis saved, daily summary is updating.')
  }

  if (authLoading) {
    return (
      <main className="app-shell">
        <section className="panel detail-panel">
          <p>Loading session...</p>
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
        </header>
        <OnboardingWizard onComplete={handleOnboardingComplete} />
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
          <img src="/mascot/happy.png" alt="" className="auth-hero__mascot" />
          <div>
            <p className="auth-hero__eyebrow">Daily nutrition</p>
            <h1 className="auth-hero__title">{headerTitle}</h1>
          </div>
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

              <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
                {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
              </button>

              <div className="auth-divider"><span>or</span></div>

              <a href={`${API_BASE}/api/auth/google`} className="auth-google-btn">
                <GoogleIcon />
                Continue with Google
              </a>

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
      </header>

      <section className="tabs-shell tabs-shell--dark">
        <div className="tabs-header tabs-header--dark" role="tablist" aria-label="App sections">
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.currentDay ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.currentDay}
            onClick={() => setActiveTab(tabs.currentDay)}
          >
            Today
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.statistics ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.statistics}
            onClick={() => setActiveTab(tabs.statistics)}
          >
            Statistics
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.photoAnalyzer ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.photoAnalyzer}
            onClick={() => setActiveTab(tabs.photoAnalyzer)}
          >
            Log
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.profile ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.profile}
            onClick={() => setActiveTab(tabs.profile)}
          >
            Me
</button>
        </div>

        <div className="tabs-body tabs-body--dark">
          {activeTab === tabs.currentDay ? (
            <CurrentDayTab
              refreshToken={summaryRefreshToken}
              successMessage={daySuccessMessage}
              onDayUpdated={handleDayUpdated}
              displayName={authUser.displayName}
            />
          ) : null}
          {activeTab === tabs.statistics ? <StatisticsTab refreshToken={statisticsRefreshToken} /> : null}
          {activeTab === tabs.photoAnalyzer ? <PhotoAnalyzerTab onConfirmed={handleDraftConfirmed} /> : null}
          {activeTab === tabs.profile ? (
            <ProfileTab
              displayName={authUser.displayName}
              email={authUser.email}
              onLogout={handleLogout}
            />
          ) : null}
        </div>
      </section>
    </main>
  )
}
