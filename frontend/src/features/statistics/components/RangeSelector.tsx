import { useRef } from 'react'
import { RANGE_OPTIONS, localDateString, type RangeDays, type CustomRange } from '../model/formatters'

interface RangeSelectorProps {
  value: RangeDays | 'custom'
  onChange: (value: RangeDays | 'custom') => void
  customRange: CustomRange | null
  onCustomRange: (range: CustomRange) => void
}

export function RangeSelector({ value, onChange, customRange, onCustomRange }: RangeSelectorProps) {
  const fromRef = useRef<HTMLInputElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const today = localDateString(new Date())

  function tryEmit() {
    const from = fromRef.current?.value ?? ''
    const to = toRef.current?.value ?? ''
    if (from && to && from <= to) onCustomRange({ from, to })
  }

  return (
    <div className="range-selector-wrap">
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
        <button
          type="button"
          className={`range-selector__button ${value === 'custom' ? 'range-selector__button--active' : ''}`}
          onClick={() => onChange('custom')}
        >
          Custom
        </button>
      </div>

      {value === 'custom' && (
        <div className="range-custom-inputs">
          <input
            ref={fromRef}
            type="date"
            className="range-custom-inputs__input"
            defaultValue={customRange?.from ?? ''}
            max={today}
            onChange={tryEmit}
          />
          <span className="range-custom-inputs__sep">–</span>
          <input
            ref={toRef}
            type="date"
            className="range-custom-inputs__input"
            defaultValue={customRange?.to ?? today}
            max={today}
            onChange={tryEmit}
          />
        </div>
      )}
    </div>
  )
}
