import { useState } from 'react'
import { CurrentDayTab } from '../features/current-day/components/CurrentDayTab'
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
  const [daySuccessMessage, setDaySuccessMessage] = useState('')

  function handleDraftConfirmed() {
    setActiveTab(tabs.currentDay)
    setSummaryRefreshToken((current) => current + 1)
    setDaySuccessMessage('Анализ сохранён, сводка за день обновляется.')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Nutrition App v2</p>
          <h1>Панель питания</h1>
        </div>
      </header>

      <section className="tabs-shell">
        <div className="tabs-header" role="tablist" aria-label="Разделы приложения">
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.currentDay ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.currentDay}
            onClick={() => setActiveTab(tabs.currentDay)}
          >
            Текущий день
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.statistics ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.statistics}
            onClick={() => setActiveTab(tabs.statistics)}
          >
            Статистика
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button ${activeTab === tabs.photoAnalyzer ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.photoAnalyzer}
            onClick={() => setActiveTab(tabs.photoAnalyzer)}
          >
            Анализатор фото
          </button>
        </div>

        <div className="tabs-body">
          {activeTab === tabs.currentDay ? <CurrentDayTab refreshToken={summaryRefreshToken} successMessage={daySuccessMessage} /> : null}
          {activeTab === tabs.statistics ? <StatisticsTab /> : null}
          {activeTab === tabs.photoAnalyzer ? <PhotoAnalyzerTab onConfirmed={handleDraftConfirmed} /> : null}
        </div>
      </section>
    </main>
  )
}
