import { useEffect, useState } from 'react'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import { login, logout, register, fetchMe, type AuthUser } from '../features/auth/model/authApi'
import { PhotoAnalyzerTab } from '../features/photo-analyzer/components/PhotoAnalyzerTab'
import { StatisticsTab } from '../features/statistics/components/StatisticsTab'

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
          setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false })
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

  async function handleAuthSubmit() {
    setAuthSubmitting(true)
    setAuthError('')

    try {
      const nextUser = authMode === 'login'
        ? await login({ email: authEmail, password: authPassword })
        : await register({ email: authEmail, password: authPassword, displayName: authDisplayName })

      setAuthUser(nextUser)
      setAuthPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Auth failed')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleLogout() {
    await logout()
    setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false })
    setAuthPassword('')
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

  if (!authUser?.authenticated) {
    return (
      <main className="app-shell">
        <header className="app-header app-header--dark">
          <div>
            <p className="app-header__eyebrow">Daily nutrition</p>
            <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          </div>
        </header>

        <section className="panel detail-panel auth-panel auth-panel--dark">
          <div className="auth-switch-row">
            <button type="button" className={`tab-button tab-button--dark ${authMode === 'login' ? 'tab-button--active' : ''}`} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button type="button" className={`tab-button tab-button--dark ${authMode === 'register' ? 'tab-button--active' : ''}`} onClick={() => setAuthMode('register')}>
              Register
            </button>
          </div>

          <div className="auth-form-grid">
            {authMode === 'register' ? (
              <label>
                Display name
                <input value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} placeholder="Anton" />
              </label>
            ) : null}
            <label>
              Email
              <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="••••••••" />
            </label>
            <button type="button" onClick={handleAuthSubmit} disabled={authSubmitting}>
              {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </div>

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
