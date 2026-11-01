export const bookingTimeZone = 'America/Sao_Paulo'
export const bookingToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: bookingTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
export const addBookingDays = (date: string, days: number) => {
  const instant = new Date(`${date}T12:00:00Z`)
  instant.setUTCDate(instant.getUTCDate() + days)
  return instant.toISOString().slice(0, 10)
}
export const bookingDateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: bookingTimeZone }).format(new Date(`${date}T12:00:00Z`))
export const bookingClock = (iso: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: bookingTimeZone, hour: '2-digit', minute: '2-digit',
}).format(new Date(iso))
