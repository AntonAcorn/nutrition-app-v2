export const RANGE_OPTIONS = [7, 30, 90] as const
export type RangeDays = (typeof RANGE_OPTIONS)[number]
export interface CustomRange { from: string; to: string }

export const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return `${value}`
}

export function formatShortDate(value: string): string {
  const [, , day] = value.split('-')
  return day
}

export function formatExpandedDate(value: string): string {
  const [, month, day] = value.split('-')
  return `${day}.${month}`
}

export function formatMetricValue(value: number | null | undefined, digits = 2): string {
  if (value == null) {
    return '—'
  }
  return value.toFixed(digits)
}

export function localDateString(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return localDateString(d)
}
