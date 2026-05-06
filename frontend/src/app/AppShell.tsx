import { lazy, Suspense, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { listTemplates } from '../features/food-library/model/mealTemplateApi'
import { fetchNutritionStatistics } from '../features/statistics/model/statisticsApi'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import type { AuthUser } from '../features/auth/model/authApi'
import type { MealTemplateItem } from '../shared/types/nutrition'
import { SunIcon, MoonIcon, TabIconToday, TabIconStats, TabIconFast, TabIconLibrary, TabIconMe } from './icons'

const PhotoAnalyzerTab = lazy(() => import('../features/photo-analyzer/components/PhotoAnalyzerTab').then(m => ({ default: m.PhotoAnalyzerTab })))
const StatisticsTab    = lazy(() => import('../features/statistics/components/StatisticsTab').then(m => ({ default: m.StatisticsTab })))
const ProfileTab       = lazy(() => import('../features/profile/components/ProfileTab').then(m => ({ default: m.ProfileTab })))
const FoodLibraryTab   = lazy(() => import('../features/food-library/components/FoodLibraryTab').then(m => ({ default: m.FoodLibraryTab })))
const FastingTab       = lazy(() => import('../features/fasting/components/FastingTab').then(m => ({ default: m.FastingTab })))

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
  const [activeTab, setActiveTab] = useState<TabKey>(tabs.currentDay)
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0)
  const [statisticsRefreshToken, setStatisticsRefreshToken] = useState(0)
  const [pendingLibrarySave, setPendingLibrarySave] = useState<{ name: string; items: MealTemplateItem[] } | null>(null)
  const [daySuccessMessage, setDaySuccessMessage] = useState('')
  const [analyzerMode, setAnalyzerMode] = useState<'photo' | 'voice' | 'barcode'>('photo')
  const [initialAnalyzerPhoto, setInitialAnalyzerPhoto] = useState<File | null>(null)

  function handleDayUpdated() {
    setSummaryRefreshToken(prev => prev + 1)
    setStatisticsRefreshToken(prev => prev + 1)
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
                  onLogout={onLogout}
                  onDeleteAccount={onDeleteAccount}
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
