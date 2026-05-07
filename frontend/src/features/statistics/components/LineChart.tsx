import type { NutritionStatisticsPoint } from '../../../shared/types/nutrition'
import { buildLinePath, buildFillPath, getChartBounds, type ChartValueKey } from '../model/chartGeometry'
import { formatExpandedDate } from '../model/formatters'

interface LineChartProps {
  title: string
  unit: string
  points: NutritionStatisticsPoint[]
  valueKey: ChartValueKey
  targetKey?: 'calorieTarget'
  colorClass: string
  gradColor: string
  trendline?: Array<number | null>
  goalLine?: number | null
}

export function LineChart({
  title,
  unit,
  points,
  valueKey,
  targetKey,
  colorClass,
  gradColor,
  trendline,
  goalLine,
}: LineChartProps) {
  const values = points.map((point) => point[valueKey] ?? null)
  const targets = targetKey ? points.map((point) => point[targetKey] ?? null) : []
  const width = 760
  const height = 180
  const { min, max } = getChartBounds({ values, targets, trendline, valueKey, goalLine })
  const range = Math.max(1, max - min)

  const valuePath    = buildLinePath(values, width, height, min, max)
  const fillPath     = buildFillPath(values, width, height, min, max)
  const targetPath   = targets.length > 0 ? buildLinePath(targets, width, height, min, max) : ''
  const trendlinePath = trendline ? buildLinePath(trendline, width, height, min, max) : ''

  const guideValues = [min, (min + max) / 2, max]
  const dateAxisIndexes = (() => {
    if (points.length === 0) return []
    const mid = Math.floor((points.length - 1) / 2)
    return [...new Set([0, mid, points.length - 1])].sort((a, b) => a - b)
  })()

  // latest non-null value + dot position
  let lastNonNullIdx = -1
  for (let i = values.length - 1; i >= 0; i--) { if (values[i] != null) { lastNonNullIdx = i; break } }
  const latestValue = lastNonNullIdx >= 0 ? values[lastNonNullIdx] : null
  const dotX = lastNonNullIdx >= 0 ? (values.length === 1 ? width / 2 : (lastNonNullIdx / (values.length - 1)) * width) : null
  const dotY = latestValue != null ? height - ((latestValue - min) / range) * height : null
  const gradId = `grad-${title.toLowerCase().replace(/\s+/g, '-')}`

  const numericValues = values.filter((v): v is number => v != null)
  const avgValue = numericValues.length > 0
    ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    : null
  const formattedAvg = avgValue != null
    ? (valueKey === 'weightKg' ? avgValue.toFixed(1) : Math.round(avgValue).toString())
    : null

  const chartContent = (
    <div className="line-chart line-chart--dark-card">
      <div className="line-chart__canvas line-chart__canvas--dark">
        <div className="line-chart__plot">
          <div className={`line-chart__grid line-chart__grid--dark ${valueKey === 'weightKg' ? 'line-chart__grid--hidden' : ''}`}>
            {guideValues.map((guide) => (
              <span key={`${title}-grid-${guide}`} />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart__svg" role="img" aria-label={title}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={gradColor} stopOpacity="0.32" />
                <stop offset="80%"  stopColor={gradColor} stopOpacity="0.04" />
                <stop offset="100%" stopColor={gradColor} stopOpacity="0"    />
              </linearGradient>
            </defs>
            {fillPath ? <path d={fillPath} fill={`url(#${gradId})`} stroke="none" /> : null}
            <path d={valuePath} className={`line-chart__path ${colorClass} line-chart__path--glow`} />
            {targetPath ? <path d={targetPath} className="line-chart__path line-chart__path--target" /> : null}
            {trendlinePath ? <path d={trendlinePath} className="line-chart__path line-chart__path--trendline" /> : null}
            {goalLine != null ? (() => {
              const goalY = height - ((goalLine - min) / range) * height
              return (
                <g>
                  <line x1={0} y1={goalY.toFixed(1)} x2={width} y2={goalY.toFixed(1)} className="line-chart__path--goal-line" strokeDasharray="6 4" strokeWidth="1.5" stroke="rgba(251,191,36,0.7)" />
                  <text x={width - 4} y={goalY - 5} fontSize="20" textAnchor="end" fill="rgba(251,191,36,0.8)">{goalLine} kg</text>
                </g>
              )
            })() : null}
            {dotX != null && dotY != null ? (
              <circle cx={dotX.toFixed(1)} cy={dotY.toFixed(1)} r="7" fill={gradColor} className="line-chart__dot" strokeWidth="2.5" />
            ) : null}
          </svg>
          <div className="line-chart__axis line-chart__axis--x">
            {dateAxisIndexes.map(i => (
              <span key={points[i].entryDate}>{formatExpandedDate(points[i].entryDate)}</span>
            ))}
          </div>
        </div>
      </div>
      {(trendline && trendline.some(v => v != null)) || goalLine != null ? (
        <div className="chart-legend">
          {trendline && trendline.some(v => v != null) ? (
            <>
              <span className="chart-legend__item">
                <span className="chart-legend__line chart-legend__line--solid" style={{ background: gradColor }} />
                Weight
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__line chart-legend__line--dashed" style={{ borderTopColor: 'rgba(168,85,247,0.75)' }} />
                5-day trend
              </span>
            </>
          ) : null}
          {goalLine != null ? (
            <span className="chart-legend__item">
              <span className="chart-legend__line chart-legend__line--dashed" style={{ borderTopColor: 'rgba(251,191,36,0.7)' }} />
              Goal: {goalLine} kg
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  return (
    <section className="panel statistics-panel statistics-panel--dark">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">Metric</p>
          <h3>{title}</h3>
        </div>
        {formattedAvg != null && (
          <span className="chart-latest-value">
            <span className="chart-latest-unit">avg </span>{formattedAvg}<span className="chart-latest-unit"> {unit}</span>
          </span>
        )}
      </div>
      {chartContent}
    </section>
  )
}
