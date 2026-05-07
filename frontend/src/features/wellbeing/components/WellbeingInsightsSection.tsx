import { useQuery } from '@tanstack/react-query'
import { getWellbeingInsights, getWellbeingTrend, getWellbeingNudge } from '../model/wellbeingApi'
import { EnergyTrendChart } from './EnergyTrendChart'

const TREND_DAYS = 14

export function WellbeingInsightsSection() {
  const { data } = useQuery({
    queryKey: ['wellbeing-insights'],
    queryFn: getWellbeingInsights,
    staleTime: 5 * 60_000,
  })

  const { data: trend } = useQuery({
    queryKey: ['wellbeing-trend', TREND_DAYS],
    queryFn: () => getWellbeingTrend(TREND_DAYS),
    staleTime: 5 * 60_000,
  })

  const { data: nudge } = useQuery({
    queryKey: ['wellbeing-nudge'],
    queryFn: getWellbeingNudge,
    staleTime: 5 * 60_000,
    enabled: data?.enoughData === true,
  })

  if (!data) return null

  if (!data.enoughData) {
    const progress = Math.min(data.totalEntries / data.requiredEntries, 1)
    return (
      <section className="panel wellbeing-teaser">
        <p className="insights-section__label">Food &amp; Energy</p>
        <p className="wellbeing-teaser__title">Discover your energy patterns</p>
        <p className="wellbeing-teaser__desc">
          {data.requiredEntries - data.totalEntries} more check-ins to unlock food insights
        </p>
        <div className="wellbeing-teaser__progress">
          <div className="wellbeing-teaser__progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
        {trend && trend.length >= 2 && (
          <EnergyTrendChart days={trend} totalDays={TREND_DAYS} />
        )}
      </section>
    )
  }

  const hasResults = data.energizers.length > 0 || data.drainers.length > 0
  if (!hasResults) return null

  return (
    <section className="panel wellbeing-insights-section">
      <p className="insights-section__label">Food &amp; Energy patterns</p>

      {nudge?.hasNudge && nudge.message && (
        <p className="wellbeing-nudge">{nudge.message}</p>
      )}

      {data.energizers.length > 0 && (
        <div className="wellbeing-food-group">
          <p className="wellbeing-food-group__header">⚡ Give you energy</p>
          {data.energizers.map(item => (
            <div key={item.name} className="wellbeing-food-row">
              <span className="wellbeing-food-row__name">{item.name}</span>
              <span className="wellbeing-food-row__score">
                {'⚡'.repeat(Math.round(item.avgRating))}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.drainers.length > 0 && (
        <div className="wellbeing-food-group">
          <p className="wellbeing-food-group__header">😴 Make you tired</p>
          {data.drainers.map(item => (
            <div key={item.name} className="wellbeing-food-row">
              <span className="wellbeing-food-row__name">{item.name}</span>
              <span className="wellbeing-food-row__score">
                {'😴'.repeat(Math.max(1, Math.round(6 - item.avgRating)))}
              </span>
            </div>
          ))}
        </div>
      )}

      {trend && trend.length >= 2 && (
        <EnergyTrendChart days={trend} totalDays={TREND_DAYS} />
      )}
    </section>
  )
}
