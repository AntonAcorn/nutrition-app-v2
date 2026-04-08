import { useState } from 'react'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
import { PhotoAnalyzerTab } from '../features/photo-analyzer/components/PhotoAnalyzerTab'

const tabs = {
  currentDay: 'current-day',
  photoAnalyzer: 'photo-analyzer',
} as const

type TabKey = (typeof tabs)[keyof typeof tabs]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(tabs.currentDay)
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0)

  function handleDraftConfirmed() {
    setSummaryRefreshToken((current) => current + 1)
    setActiveTab(tabs.currentDay)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Nutrition App v2</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      <section className="tabs-shell">
        <div className="tabs-header" role="tablist" aria-label="Nutrition app sections">
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.currentDay ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.currentDay}
            onClick={() => setActiveTab(tabs.currentDay)}
          >
            Current day
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.photoAnalyzer ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.photoAnalyzer}
            onClick={() => setActiveTab(tabs.photoAnalyzer)}
          >
            Photo analyzer
          </button>
        </div>

        <div className="tabs-body">
          {activeTab === tabs.currentDay ? <CurrentDayTab refreshToken={summaryRefreshToken} /> : null}
          {activeTab === tabs.photoAnalyzer ? <PhotoAnalyzerTab onConfirmed={handleDraftConfirmed} /> : null}
        </div>
      </section>
    </main>
  )
}
