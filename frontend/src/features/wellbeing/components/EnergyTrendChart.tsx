import type { WellbeingTrendDay } from '../model/wellbeingApi'

interface Props {
  days: WellbeingTrendDay[]
  totalDays?: number
}

export function EnergyTrendChart({ days, totalDays = 14 }: Props) {
  if (days.length < 2) return null

  const W = 300
  const H = 52
  const PAD_X = 8
  const PAD_Y = 6

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const points = days.map(d => {
    const date = new Date(d.date)
    const daysAgo = Math.round((today.getTime() - date.getTime()) / 86400000)
    const x = PAD_X + ((totalDays - 1 - daysAgo) / Math.max(totalDays - 1, 1)) * (W - 2 * PAD_X)
    const y = H - PAD_Y - ((d.avgRating - 1) / 4) * (H - 2 * PAD_Y)
    return { x, y, rating: d.avgRating }
  })

  const overallAvg = days.reduce((s, d) => s + d.avgRating, 0) / days.length
  const lineColor = overallAvg >= 4 ? '#86efac' : overallAvg >= 3 ? '#a78bfa' : '#fde68a'
  const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const guideY = (H - PAD_Y - ((3 - 1) / 4) * (H - 2 * PAD_Y)).toFixed(1)

  return (
    <div className="energy-trend-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="energy-trend-chart__svg" aria-hidden="true">
        <line
          x1={PAD_X} y1={guideY}
          x2={W - PAD_X} y2={guideY}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill={lineColor} opacity="0.9" />
        ))}
      </svg>
      <div className="energy-trend-chart__labels">
        <span>{totalDays}d ago</span>
        <span>today</span>
      </div>
    </div>
  )
}
