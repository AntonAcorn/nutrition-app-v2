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
  const [statisticsRefreshToken, setStatisticsRefreshToken] = useState(0)
  const [daySuccessMessage, setDaySuccessMessage] = useState('')

  function handleDayUpdated() {
    setSummaryRefreshToken((current) => current + 1)
    setStatisticsRefreshToken((current) => current + 1)
  }

  function handleDraftConfirmed() {
    setActiveTab(tabs.currentDay)
    handleDayUpdated()
    setDaySuccessMessage('Анализ сохранён, сводка за день обновляется.')
  }

  return (
    <main className="app-shell">
      <header className="app-header app-header--dark">
        <div>
          <p className="app-header__eyebrow">Daily nutrition</p>
          <h1>Nutrition</h1>
        </div>
      </header>

      <section className="tabs-shell tabs-shell--dark">
        <div className="tabs-header tabs-header--dark" role="tablist" aria-label="Разделы приложения">
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.currentDay ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.currentDay}
            onClick={() => setActiveTab(tabs.currentDay)}
          >
            Сегодня
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.statistics ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.statistics}
            onClick={() => setActiveTab(tabs.statistics)}
          >
            Статистика
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-button tab-button--dark ${activeTab === tabs.photoAnalyzer ? 'tab-button--active' : ''}`}
            aria-selected={activeTab === tabs.photoAnalyzer}
            onClick={() => setActiveTab(tabs.photoAnalyzer)}
          >
            Фото
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
