import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNutritionStatistics, fetchNutritionStatisticsRange } from '../model/statisticsApi'
import { MascotSvg } from '../../current-day/components/MascotSvg'
import type { NutritionStatisticsResponse } from '../../../shared/types/nutrition'
import { formatSigned, formatExpandedDate, type RangeDays, type CustomRange } from '../model/formatters'
import { movingAvg } from '../model/chartGeometry'
import { computeStreak, computeInsights, computeCalorieSuggestion } from '../model/insights'
import { MetricCard } from './MetricCard'
import { RangeSelector } from './RangeSelector'
import { CalorieBarChart } from './CalorieBarChart'
import { LineChart } from './LineChart'
import { InsightsSection, CalorieSuggestionCard } from './InsightsSection'
import { StatisticsTable } from './StatisticsTable'

interface StatisticsTabProps {
  refreshToken?: number
}

export function StatisticsTab({ refreshToken = 0 }: StatisticsTabProps) {
  const queryClient = useQueryClient()
  const [rangeMode, setRangeMode] = useState<RangeDays | 'custom'>(30)
  const [customRange, setCustomRange] = useState<CustomRange | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const isCustomReady = rangeMode === 'custom' && customRange != null && customRange.from <= customRange.to

  const statsQuery = useQuery<NutritionStatisticsResponse>({
    queryKey: isCustomReady
      ? ['statistics', 'custom', customRange!.from, customRange!.to]
      : ['statistics', rangeMode],
    queryFn: () => isCustomReady
      ? fetchNutritionStatisticsRange(customRange!.from, customRange!.to)
      : fetchNutritionStatistics(rangeMode as RangeDays),
    enabled: rangeMode !== 'custom' || isCustomReady,
  })
  const data = statsQuery.data ?? null
  const loading = statsQuery.isLoading
  const error = statsQuery.error instanceof Error ? statsQuery.error.message : ''

  useEffect(() => {
    if (refreshToken > 0) {
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
    }
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const points = useMemo(() => data?.points ?? [], [data])
  const selectedTitle = rangeMode === 'custom' && customRange
    ? `${formatExpandedDate(customRange.from)} – ${formatExpandedDate(customRange.to)}`
    : rangeMode === 7 ? 'last week' : rangeMode === 30 ? 'last month' : 'last 3 months'
  const loggedPoints = useMemo(() => points.filter(p => p.consumedCalories > 0), [points])

  const avgCalorieBalance = useMemo(() => {
    if (loggedPoints.length === 0) return null
    const total = loggedPoints.reduce((sum, p) => sum + p.calorieBalance, 0)
    return Math.round(total / loggedPoints.length)
  }, [loggedPoints])

  const weightChange = useMemo(() => {
    const weightPoints = points.filter((point) => point.weightKg != null)
    if (weightPoints.length < 2) return null
    const first = weightPoints[0].weightKg
    const last = weightPoints[weightPoints.length - 1].weightKg
    if (first == null || last == null) return null
    return last - first
  }, [points])

  const onTargetDays = useMemo(() => {
    return loggedPoints.filter(p => p.calorieBalance <= 0).length
  }, [loggedPoints])

  const streak = useMemo(() => computeStreak(points), [points])
  const weightTrendline = useMemo(() => movingAvg(points), [points])
  const effectiveDays = rangeMode === 'custom' && customRange
    ? Math.max(1, Math.ceil((new Date(customRange.to + 'T12:00:00').getTime() - new Date(customRange.from + 'T12:00:00').getTime()) / 86400000) + 1)
    : rangeMode as number

  const insights = useMemo(
    () => computeInsights(loggedPoints, points, data?.targetWeightKg ?? null, effectiveDays),
    [loggedPoints, points, data, effectiveDays],
  )
  const calorieSuggestion = useMemo(
    () => computeCalorieSuggestion(loggedPoints, points, data?.targetWeightKg ?? null),
    [loggedPoints, points, data],
  )

  return (
    <section className="screen-section screen-section--statistics-dark">
      <header className="screen-header screen-header--statistics-dark">
        <div>
          <p className="screen-header__eyebrow">Analytics</p>
          <h2>Nutrition trends</h2>
        </div>
        <div className="statistics-toolbar">
          <p className="screen-header__meta">Last 7, 30, or 90 days, including today.</p>
          <RangeSelector
            value={rangeMode}
            onChange={setRangeMode}
            customRange={customRange}
            onCustomRange={setCustomRange}
          />
        </div>
      </header>

      {loading ? (
        <>
          <section className="panel statistics-panel statistics-panel--dark">
            <div className="skeleton" style={{ height: '1rem', width: '40%', marginBottom: 14 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: '1rem' }} />
          </section>
          <section className="stats-metric-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card" style={{ padding: 18 }}>
                <div className="skeleton" style={{ height: '0.75rem', width: '55%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: '1.6rem', width: '70%' }} />
              </div>
            ))}
          </section>
        </>
      ) : null}

      {!loading && error ? <section className="panel detail-panel"><p className="error-text">{error}</p></section> : null}

      {!loading && !error && data && loggedPoints.length === 0 ? (
        <div className="empty-state">
          <MascotSvg mood="neutral" size={140} className="empty-state__mascot" />
          <h3 className="empty-state__title">No data yet for this period</h3>
          <p className="empty-state__hint">
            Log meals on the Today tab — once you've got a few days, charts and trends will appear here.
          </p>
        </div>
      ) : null}

      {!loading && !error && data && loggedPoints.length > 0 && loggedPoints.length < 3 ? (
        <section className="panel statistics-empty-state" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
          <p className="statistics-empty-state__hint" style={{ margin: 0 }}>Only {loggedPoints.length} day{loggedPoints.length > 1 ? 's' : ''} logged — charts will be more useful with 3+ days of data.</p>
        </section>
      ) : null}

      {!loading && !error && data && loggedPoints.length > 0 ? (
        <>
          {/* ── Primary: always visible ── */}
          {calorieSuggestion && <CalorieSuggestionCard suggestion={calorieSuggestion} />}

          <section className="stats-metric-grid">
            <MetricCard
              title="Avg calorie balance"
              value={avgCalorieBalance == null ? '—' : `${formatSigned(avgCalorieBalance)} kcal/day`}
              detail={`Across ${selectedTitle}`}
              tone={avgCalorieBalance == null ? 'neutral' : avgCalorieBalance <= 0 ? 'good' : 'bad'}
              emoji={avgCalorieBalance == null ? '🙂' : avgCalorieBalance <= -150 ? '🟢' : avgCalorieBalance <= 150 ? '🟡' : '🔴'}
            />
            <MetricCard
              title="Weight change"
              value={weightChange == null ? '—' : `${formatSigned(Number(weightChange.toFixed(1)))} kg`}
              detail={weightChange == null ? 'Not enough weigh-ins in this range' : `From first to last weigh-in in ${selectedTitle}`}
              tone={weightChange == null ? 'neutral' : weightChange <= 0 ? 'good' : 'bad'}
              emoji={weightChange == null ? '⚖️' : weightChange <= -0.2 ? '📉' : weightChange < 0.2 ? '➖' : '📈'}
            />
          </section>

          <LineChart
            title="Weight"
            unit="kg"
            points={points}
            valueKey="weightKg"
            colorClass="line-chart__path--weight"
            gradColor="#7b61ff"
            trendline={weightTrendline}
            goalLine={data.targetWeightKg}
          />

          <section className="panel statistics-panel statistics-panel--dark">
            <div className="statistics-panel__header">
              <div>
                <p className="screen-header__eyebrow">Metric</p>
                <h3>Calorie balance</h3>
              </div>
            </div>
            <CalorieBarChart points={points} />
          </section>

          {/* ── Secondary: behind toggle ── */}
          <button
            type="button"
            className="stats-show-more-btn"
            onClick={() => setShowDetails(v => !v)}
          >
            {showDetails ? 'Hide details ▲' : 'Show details ▼'}
          </button>

          {showDetails && (
            <>
              <section className="stats-metric-grid">
                <MetricCard
                  title="On-target days"
                  value={loggedPoints.length === 0 ? '—' : `${onTargetDays} / ${loggedPoints.length}`}
                  detail={loggedPoints.length === 0 ? 'No logged days in this range' : 'Logged days at or under target'}
                  tone={loggedPoints.length === 0 ? 'neutral' : onTargetDays / loggedPoints.length >= 0.7 ? 'good' : onTargetDays / loggedPoints.length >= 0.4 ? 'neutral' : 'bad'}
                  emoji={loggedPoints.length === 0 ? '🎯' : onTargetDays / loggedPoints.length >= 0.7 ? '🎯' : onTargetDays / loggedPoints.length >= 0.4 ? '👀' : '⚠️'}
                />
                <MetricCard
                  title="Streak"
                  value={streak === 0 ? '—' : `${streak} day${streak === 1 ? '' : 's'}`}
                  detail={streak === 0 ? 'Log today to start a streak' : streak >= 7 ? 'Keep it up!' : 'Days logged in a row'}
                  tone={streak === 0 ? 'neutral' : streak >= 7 ? 'good' : 'neutral'}
                  emoji={streak === 0 ? '💤' : streak >= 14 ? '🔥' : streak >= 7 ? '⚡' : '📅'}
                />
              </section>

              <LineChart
                title="Calories"
                unit="kcal"
                points={points}
                valueKey="consumedCalories"
                targetKey="calorieTarget"
                colorClass="line-chart__path--calories"
                gradColor="#f08a4b"
              />

              <InsightsSection insights={insights} />

              <LineChart
                title="Protein"
                unit="g"
                points={points}
                valueKey="proteinGrams"
                colorClass="line-chart__path--protein"
                gradColor="#3a86ff"
              />
              <LineChart
                title="Fat"
                unit="g"
                points={points}
                valueKey="fatGrams"
                colorClass="line-chart__path--fat"
                gradColor="#d65a8d"
              />
              <LineChart
                title="Carbs"
                unit="g"
                points={points}
                valueKey="carbsGrams"
                colorClass="line-chart__path--carbs"
                gradColor="#f6ad55"
              />
              <LineChart
                title="Fiber"
                unit="g"
                points={points}
                valueKey="fiberGrams"
                colorClass="line-chart__path--fiber"
                gradColor="#38a169"
              />
              <StatisticsTable points={points} />
            </>
          )}
        </>
      ) : null}
    </section>
  )
}
