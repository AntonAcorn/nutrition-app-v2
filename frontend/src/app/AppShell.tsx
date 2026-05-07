import { lazy, Suspense, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { listTemplates } from '../features/food-library/model/mealTemplateApi'
import { fetchNutritionStatistics } from '../features/statistics/model/statisticsApi'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import type { AuthUser } from '../features/auth/model/authApi'
import type { MealTemplateItem } from '../shared/types/nutrition'
import { SunIcon, MoonIcon, TabIconToday, TabIconStats, TabIconLibrary, TabIconMe } from './icons'

const PhotoAnalyzerTab = lazy(() => import('../features/photo-analyzer/components/PhotoAnalyzerTab').then(m => ({ default: m.PhotoAnalyzerTab })))
const StatisticsTab    = lazy(() => import('../features/statistics/components/StatisticsTab').then(m => ({ default: m.StatisticsTab })))
const ProfileTab       = lazy(() => import('../features/profile/components/ProfileTab').then(m => ({ default: m.ProfileTab })))
const FoodLibraryTab   = lazy(() => import('../features/food-library/components/FoodLibraryTab').then(m => ({ default: m.FoodLibraryTab })))
const FastingTab       = lazy(() => import('../features/fasting/components/FastingTab').then(m => ({ default: m.FastingTab })))

type Theme = 'dark' | 'light'

const ROUTES = {
  today: '/',
  stats: '/stats',
  fasting: '/fasting',
  library: '/library',
  profile: '/profile',
  analyze: '/analyze',
} as const

type AnalyzeNavState = { mode?: 'photo' | 'voice' | 'barcode'; photo?: File | null }
type LibraryNavState = { pendingSave?: { name: string; items: MealTemplateItem[] } }
type TodayNavState   = { successMessage?: string }

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

interface AppShellProps {
  authUser: AuthUser
  theme: Theme
  onToggleTheme: () => void
  onLogout: () => Promise<void> | void
  onDeleteAccount: () => Promise<void> | void
}

export function AppShell({ authUser, theme, onToggleTheme, onLogout, onDeleteAccount }: AppShellProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0)
  const [statisticsRefreshToken, setStatisticsRefreshToken] = useState(0)

  function handleDayUpdated() {
    setSummaryRefreshToken(prev => prev + 1)
    setStatisticsRefreshToken(prev => prev + 1)
  }

  function prefetchForRoute(route: string) {
    if (route === ROUTES.library) {
      qc.prefetchQuery({ queryKey: ['meal-templates'], queryFn: () => listTemplates(), staleTime: 60_000 })
    } else if (route === ROUTES.stats) {
      qc.prefetchQuery({ queryKey: ['statistics', 30], queryFn: () => fetchNutritionStatistics(30), staleTime: 60_000 })
    }
  }

  function openAnalyzer(mode: 'photo' | 'voice' | 'barcode') {
    navigate(ROUTES.analyze, { state: { mode } satisfies AnalyzeNavState })
  }

  function openAnalyzerWithPhoto(file: File) {
    navigate(ROUTES.analyze, { state: { mode: 'photo', photo: file } satisfies AnalyzeNavState })
  }

  function handleDraftConfirmed() {
    handleDayUpdated()
    navigate(ROUTES.today, { state: { successMessage: 'Analysis saved, daily summary is updating.' } satisfies TodayNavState })
  }

  function handleSaveToLibrary(data: { name: string; items: MealTemplateItem[] }) {
    navigate(ROUTES.library, { state: { pendingSave: data } satisfies LibraryNavState })
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
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <section className="tabs-shell tabs-shell--dark">
        <div className="tabs-body tabs-body--dark">
          <Suspense fallback={<TabLoadingSkeleton />}>
            <Routes>
              <Route
                path={ROUTES.today}
                element={
                  <TodayScreen
                    authUser={authUser}
                    refreshToken={summaryRefreshToken}
                    onDayUpdated={handleDayUpdated}
                    openAnalyzer={openAnalyzer}
                    openAnalyzerWithPhoto={openAnalyzerWithPhoto}
                  />
                }
              />
              <Route path={ROUTES.stats}    element={<StatsScreen refreshToken={statisticsRefreshToken} />} />
              <Route path={ROUTES.fasting}  element={<FastingScreen />} />
              <Route
                path={ROUTES.library}
                element={<LibraryScreen onLogged={handleDayUpdated} />}
              />
              <Route
                path={ROUTES.profile}
                element={
                  <ProfileScreen
                    authUser={authUser}
                    onLogout={onLogout}
                    onDeleteAccount={onDeleteAccount}
                  />
                }
              />
              <Route
                path={ROUTES.analyze}
                element={
                  <AnalyzeScreen
                    onConfirmed={handleDraftConfirmed}
                    onSaveToLibrary={handleSaveToLibrary}
                  />
                }
              />
              <Route path="*" element={<Navigate to={ROUTES.today} replace />} />
            </Routes>
          </Suspense>
        </div>
      </section>

      <nav className="bottom-tab-bar" role="tablist" aria-label="App sections">
        {([
          { route: ROUTES.today,   label: 'Today',   Icon: TabIconToday   },
          { route: ROUTES.stats,   label: 'Stats',   Icon: TabIconStats   },
          { route: ROUTES.library, label: 'Library', Icon: TabIconLibrary },
          { route: ROUTES.profile, label: 'Me',      Icon: TabIconMe      },
        ] as const).map(({ route, label, Icon }) => (
          <NavLink
            key={route}
            to={route}
            end={route === ROUTES.today}
            role="tab"
            className={({ isActive }) => `bottom-tab-item${isActive ? ' bottom-tab-item--active' : ''}`}
            onTouchStart={() => prefetchForRoute(route)}
            onMouseEnter={() => prefetchForRoute(route)}
          >
            <Icon />
            <span className="bottom-tab-item__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </main>
  )
}

// ── Screen wrappers — read navigate state from useLocation ───────────────────

interface TodayScreenProps {
  authUser: AuthUser
  refreshToken: number
  onDayUpdated: () => void
  openAnalyzer: (mode: 'photo' | 'voice' | 'barcode') => void
  openAnalyzerWithPhoto: (file: File) => void
}

function TodayScreen({ authUser, refreshToken, onDayUpdated, openAnalyzer, openAnalyzerWithPhoto }: TodayScreenProps) {
  const location = useLocation()
  const successMessage = (location.state as TodayNavState | null)?.successMessage ?? ''
  return (
    <CurrentDayTab
      refreshToken={refreshToken}
      successMessage={successMessage}
      onDayUpdated={onDayUpdated}
      displayName={authUser.displayName}
      onOpenAnalyzer={openAnalyzer}
      onOpenAnalyzerWithPhoto={openAnalyzerWithPhoto}
    />
  )
}

function StatsScreen({ refreshToken }: { refreshToken: number }) {
  return <StatisticsTab refreshToken={refreshToken} />
}

function FastingScreen() {
  return <FastingTab />
}

function LibraryScreen({ onLogged }: { onLogged: () => void }) {
  const location = useLocation()
  const [pendingSave, setPendingSave] = useState<LibraryNavState['pendingSave']>(
    (location.state as LibraryNavState | null)?.pendingSave,
  )
  return (
    <FoodLibraryTab
      onLogged={onLogged}
      initialSave={pendingSave ?? null}
      onInitialSaveDone={() => setPendingSave(undefined)}
    />
  )
}

function ProfileScreen({
  authUser,
  onLogout,
  onDeleteAccount,
}: {
  authUser: AuthUser
  onLogout: () => Promise<void> | void
  onDeleteAccount: () => Promise<void> | void
}) {
  return (
    <ProfileTab
      displayName={authUser.displayName}
      email={authUser.email}
      onLogout={onLogout}
      onDeleteAccount={onDeleteAccount}
    />
  )
}

interface AnalyzeScreenProps {
  onConfirmed: () => void
  onSaveToLibrary: (data: { name: string; items: MealTemplateItem[] }) => void
}

function AnalyzeScreen({ onConfirmed, onSaveToLibrary }: AnalyzeScreenProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as AnalyzeNavState | null
  return (
    <PhotoAnalyzerTab
      onConfirmed={onConfirmed}
      onSaveToLibrary={onSaveToLibrary}
      initialMode={state?.mode ?? 'photo'}
      initialPhoto={state?.photo ?? null}
      onBack={() => navigate(ROUTES.today)}
    />
  )
}
