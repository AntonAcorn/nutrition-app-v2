import { lazy, Suspense, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { listTemplates } from '../features/food-library/model/mealTemplateApi'
import { fetchNutritionStatistics } from '../features/statistics/model/statisticsApi'
import { SunIcon, MoonIcon, TabIconToday, TabIconStats, TabIconFast, TabIconLibrary, TabIconMe } from './icons'
import { AuthShell } from './AuthShell'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import { logout, fetchMe, deleteAccount, type AuthUser } from '../features/auth/model/authApi'

const PhotoAnalyzerTab = lazy(() => import('../features/photo-analyzer/components/PhotoAnalyzerTab').then(m => ({ default: m.PhotoAnalyzerTab })))
const StatisticsTab    = lazy(() => import('../features/statistics/components/StatisticsTab').then(m => ({ default: m.StatisticsTab })))
const OnboardingWizard = lazy(() => import('../features/onboarding/components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })))
const ProfileTab       = lazy(() => import('../features/profile/components/ProfileTab').then(m => ({ default: m.ProfileTab })))
const FoodLibraryTab   = lazy(() => import('../features/food-library/components/FoodLibraryTab').then(m => ({ default: m.FoodLibraryTab })))
const FastingTab       = lazy(() => import('../features/fasting/components/FastingTab').then(m => ({ default: m.FastingTab })))
import type { MealTemplateItem } from '../shared/types/nutrition'
import { identifyUser, resetAnalyticsUser, track } from '../shared/lib/analytics'

async function checkNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
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

  function resetAuthState() {
    setAuthUser({ accountId: null, email: null, displayName: null, nutritionUserId: null, authenticated: false, hasProfile: false, emailVerified: false })
  }

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

  const showAuthShell = !authUser?.authenticated || (authUser?.authenticated && !authUser.emailVerified)

  if (showAuthShell) {
    return (
      <AuthShell
        authUser={authUser}
        isNative={isNative}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={(user) => setAuthUser(user)}
        onResetUser={() => setAuthUser(null)}
      />
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
