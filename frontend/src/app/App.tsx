import { FormEvent, useEffect, useState } from 'react'

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
import { login, logout, register, fetchMe, type AuthUser } from '../features/auth/model/authApi'
import { PhotoAnalyzerTab } from '../features/photo-analyzer/components/PhotoAnalyzerTab'
import { StatisticsTab } from '../features/statistics/components/StatisticsTab'
import { OnboardingWizard } from '../features/onboarding/components/OnboardingWizard'

const tabs = {
  currentDay: 'current-day',
  statistics: 'statistics',
  photoAnalyzer: 'photo-analyzer',
} as const

type TabKey = (typeof tabs)[keyof typeof tabs]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(tabs.currentDay)
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0)
  const [statisticsRefreshToken, setStatisticsRefreshToken] = useState(0)
  const [daySuccessMessage, setDaySuccessMessage] = useState('')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
    return (
      <main className="app-shell">
        <header className="app-header app-header--dark">
          <div>
            <p className="app-header__eyebrow">Daily nutrition</p>
            <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          </div>
        </header>

        <section className="auth-panel auth-panel--dark">
          <div className="tabs-header tabs-header--dark auth-switch-row">
            <button type="button" className={`tab-button tab-button--dark ${authMode === 'login' ? 'tab-button--active' : ''}`} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button type="button" className={`tab-button tab-button--dark ${authMode === 'register' ? 'tab-button--active' : ''}`} onClick={() => setAuthMode('register')}>
              Register
            </button>
          </div>

          <form className="auth-form-grid" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? (
              <label>
                Display name
                <input
                  name="name"
                  autoComplete="name"
                  value={authDisplayName}
                  onChange={(event) => setAuthDisplayName(event.target.value)}
                  placeholder="Anton"
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
            {authMode === 'register' ? (
              <label>
                Confirm password
                <div className="password-input-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    value={authConfirmPassword}
                    onChange={(event) => setAuthConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)} tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>
            ) : null}
            <button type="submit" disabled={authSubmitting}>
              {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>

          {authError ? <p className="error-text">{authError}</p> : null}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header app-header--dark">
        <div>
          <p className="app-header__eyebrow">Daily nutrition</p>
          <h1>Nutrition</h1>
        </div>
        <div className="app-header__actions">
          <span className="subtle-text">{authUser.displayName || authUser.email}</span>
          <button type="button" className="chart-expand-button" onClick={handleLogout}>Log out</button>
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
            Photo
          </button>
        </div>

        <div className="tabs-body tabs-body--dark">
          {activeTab === tabs.currentDay ? (
            <CurrentDayTab
              refreshToken={summaryRefreshToken}
              successMessage={daySuccessMessage}
              onDayUpdated={handleDayUpdated}
            />
          ) : null}
          {activeTab === tabs.statistics ? <StatisticsTab refreshToken={statisticsRefreshToken} /> : null}
          {activeTab === tabs.photoAnalyzer ? <PhotoAnalyzerTab onConfirmed={handleDraftConfirmed} /> : null}
        </div>
      </section>
    </main>
  )
}
