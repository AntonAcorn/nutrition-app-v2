import { RANGE_OPTIONS, type RangeDays } from '../model/formatters'

export function RangeSelector({ value, onChange }: { value: RangeDays; onChange: (value: RangeDays) => void }) {
  return (
    <div className="range-selector" role="tablist" aria-label="Statistics range">
      {RANGE_OPTIONS.map((days) => {
        const label = days === 7 ? '7d' : days === 30 ? '30d' : '90d'
        return (
          <button
            key={days}
            type="button"
            className={`range-selector__button ${value === days ? 'range-selector__button--active' : ''}`}
            onClick={() => onChange(days)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
