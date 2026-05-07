import type { NutritionStatisticsPoint } from '../../../shared/types/nutrition'
import { formatShortDate } from '../model/formatters'

export function CalorieBarChart({ points }: { points: NutritionStatisticsPoint[] }) {
  const W = 600
  // Layout: [label row 28px] [chart 160px] [dates row 28px] = 216
  const labelH = 28, chartH = 160, dateH = 28
  const H = labelH + chartH + dateH
  const midY = labelH + chartH / 2
  const logged = points.filter(p => p.consumedCalories > 0)
  const maxAbs = Math.max(200, ...logged.map(p => Math.abs(p.calorieBalance)))
  const gap = W / Math.max(points.length, 1)
  const barW = Math.max(5, gap * 0.6)
  const dateLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1]

  // dateH used implicitly in H total; reference to silence unused var warning is unnecessary
  void dateH

  return (
    <div className="cal-bar-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="cal-bar-chart__svg">
        {/* top label row: "surplus ↑" left, "±N kcal" right */}
        <text x={4} y={20} fontSize="22" fill="rgba(239,68,68,0.6)">surplus ↑</text>
        <text x={W - 4} y={20} fontSize="22" className="cal-bar__label-kcal" textAnchor="end">±{Math.round(maxAbs)} kcal</text>

        {/* guide lines */}
        {[1, 0.5].map(pct => {
          const yT = midY - pct * (chartH / 2 - 2)
          const yB = midY + pct * (chartH / 2 - 2)
          return (
            <g key={pct}>
              <line x1={0} y1={yT} x2={W} y2={yT} className="cal-bar__guideline" strokeWidth="1" />
              <line x1={0} y1={yB} x2={W} y2={yB} className="cal-bar__guideline" strokeWidth="1" />
            </g>
          )
        })}
        {/* zero line */}
        <line x1={0} y1={midY} x2={W} y2={midY} className="cal-bar__zeroline" strokeWidth="1.5" />

        {/* bars — only for days with logged calories */}
        {points.map((p, i) => {
          if (p.consumedCalories === 0) return null
          const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
          const barH = Math.max(2, (Math.abs(p.calorieBalance) / maxAbs) * (chartH / 2 - 6))
          const isOver = p.calorieBalance >= 0
          return (
            <rect key={p.entryDate}
              x={x - barW / 2} y={isOver ? midY - barH : midY}
              width={barW} height={barH}
              className={isOver ? 'calorie-bar--over' : 'calorie-bar--under'}
              rx="3"
            />
          )
        })}

        {/* bottom label row: "deficit ↓" left, dates right-aligned */}
        <text x={4} y={labelH + chartH + 22} fontSize="22" fill="rgba(34,197,94,0.6)">deficit ↓</text>
        {points.map((p, i) => {
          if (!dateLabels.includes(i)) return null
          const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
          const anchor = i === 0 ? 'middle' : i === points.length - 1 ? 'end' : 'middle'
          // skip first date label — it would overlap "deficit ↓"
          if (i === 0) return null
          return (
            <text key={p.entryDate} x={x} y={labelH + chartH + 22} fontSize="22" className="cal-bar__date" textAnchor={anchor}>
              {formatShortDate(p.entryDate)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
