import type { NutritionStatisticsPoint } from '../../../shared/types/nutrition'
import { formatExpandedDate, formatMetricValue, formatSigned } from '../model/formatters'

export function StatisticsTable({ points }: { points: NutritionStatisticsPoint[] }) {
  const orderedPoints = [...points].reverse()

  return (
    <section className="panel statistics-panel statistics-panel--dark">
      <div className="statistics-panel__header">
        <div>
          <p className="screen-header__eyebrow">History</p>
          <h3>Daily values</h3>
        </div>
      </div>

      <div className="statistics-table">
        <div className="statistics-table__head statistics-table__row">
          <span>Date</span>
          <span>Weight</span>
          <span>Calories</span>
          <span>Target</span>
          <span>Balance</span>
          <span>Protein</span>
          <span>Fat</span>
          <span>Carbs</span>
          <span>Fiber</span>
        </div>
        {orderedPoints.map((point) => (
          <div className="statistics-table__row" key={point.entryDate}>
            <span>{formatExpandedDate(point.entryDate)}</span>
            <span>{point.weightKg == null ? '—' : point.weightKg.toFixed(1)}</span>
            <strong>{formatMetricValue(point.consumedCalories)}</strong>
            <span>{formatMetricValue(point.calorieTarget)}</span>
            <strong className={point.calorieBalance > 0 ? 'text-over' : 'text-under'}>{formatSigned(point.calorieBalance)}</strong>
            <span>{formatMetricValue(point.proteinGrams)}</span>
            <span>{formatMetricValue(point.fatGrams)}</span>
            <span>{formatMetricValue(point.carbsGrams)}</span>
            <span>{formatMetricValue(point.fiberGrams)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
