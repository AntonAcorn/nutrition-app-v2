export const APP_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

function getTimeZoneParts(date: Date, timeZone: string = APP_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error(`Failed to format date parts for timezone ${timeZone}`)
  }

  return { year, month, day }
}

export function formatLocalDateInputValue(date: Date, timeZone: string = APP_TIME_ZONE): string {
  const { year, month, day } = getTimeZoneParts(date, timeZone)
  return `${year}-${month}-${day}`
}

export function getTodayLocalDateInputValue(timeZone: string = APP_TIME_ZONE): string {
  return formatLocalDateInputValue(new Date(), timeZone)
}

export function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return formatLocalDateInputValue(d)
}

export function formatNavDateLabel(dateStr: string): string {
  const today = getTodayLocalDateInputValue()
  if (dateStr === today) return 'Today'
  if (dateStr === offsetDate(today, -1)) return 'Yesterday'
  const d = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}
