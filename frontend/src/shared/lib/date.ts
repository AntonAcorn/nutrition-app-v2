export const APP_TIME_ZONE = 'America/Toronto'

export function formatLocalDateInputValue(date: Date, timeZone: string = APP_TIME_ZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

export function getTodayLocalDateInputValue(timeZone: string = APP_TIME_ZONE): string {
  return formatLocalDateInputValue(new Date(), timeZone)
}
