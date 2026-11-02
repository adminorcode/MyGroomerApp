import { AgendaAppointment } from '../../types/agenda.types'

export const AGENDA_TIMEZONE = 'America/Sao_Paulo'
const OFFSET = '-03:00'

export type AgendaView = 'today' | 'week' | 'month'

export type AgendaFilter = 'all' | 'pending_confirmation' | 'confirmed' | 'en_route'

const dateOnly = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENDA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function saoPauloDate(instant: Date): string {
  return dateOnly.format(instant)
}

export function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00${OFFSET}`)
  date.setUTCDate(date.getUTCDate() + days)
  return saoPauloDate(date)
}

function weekday(ymd: string): number {
  return new Date(`${ymd}T12:00:00${OFFSET}`).getUTCDay()
}

function atOffset(ymd: string): string {
  return `${ymd}T00:00:00${OFFSET}`
}

const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  timeZone: AGENDA_TIMEZONE,
  day: 'numeric',
  month: 'long',
})

const monthYear = new Intl.DateTimeFormat('pt-BR', {
  timeZone: AGENDA_TIMEZONE,
  month: 'long',
  year: 'numeric',
})

function noon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00${OFFSET}`)
}

export function periodWindow(view: AgendaView, now = new Date()): { from: string, to: string, label: string } {
  const today = saoPauloDate(now)
  if (view === 'today') {
    return {
      from: atOffset(today),
      to: atOffset(addDays(today, 1)),
      label: `Hoje, ${dayMonth.format(noon(today))}`,
    }
  }
  if (view === 'week') {
    const monday = addDays(today, -((weekday(today) + 6) % 7))
    const sunday = addDays(monday, 6)
    const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7)
    const label = sameMonth
      ? `${dayMonth.format(noon(monday)).split(' de ')[0]} a ${dayMonth.format(noon(sunday))}`
      : `${dayMonth.format(noon(monday))} a ${dayMonth.format(noon(sunday))}`
    return { from: atOffset(monday), to: atOffset(addDays(monday, 7)), label }
  }
  const [year, month] = today.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return { from: atOffset(start), to: atOffset(next), label: monthYear.format(noon(start)) }
}

export function initialBlockDate(from: string, to: string, now = new Date()): string {
  const today = saoPauloDate(now)
  const start = new Date(atOffset(today)).getTime()
  if (start >= new Date(from).getTime() && start < new Date(to).getTime()) return today
  return saoPauloDate(new Date(from))
}

export function clockInSaoPaulo(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: AGENDA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function dayHeading(ymd: string, today: string): string {
  const formatted = dayMonth.format(noon(ymd))
  return ymd === today ? `Hoje, ${formatted}` : formatted
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

export function blockRangeError(date: string, start: string, end: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Informe a data no formato AAAA-MM-DD.'
  const startMatch = TIME.exec(start)
  const endMatch = TIME.exec(end)
  if (!startMatch || Number(startMatch[2]) % 15 !== 0) return 'O início usa intervalos de 15 minutos.'
  if (!endMatch || Number(endMatch[2]) % 15 !== 0) return 'O fim usa intervalos de 15 minutos.'
  if (end <= start) return 'O fim precisa ser depois do início.'
  return null
}

export function blockInstants(date: string, start: string, end: string): { starts_at: string, ends_at: string } {
  return {
    starts_at: `${date}T${start}:00${OFFSET}`,
    ends_at: `${date}T${end}:00${OFFSET}`,
  }
}

export function agendaSummary(appointments: AgendaAppointment[], now = new Date()) {
  const pending = appointments.filter(item => item.booking_status === 'pending_confirmation').length
  const visits = appointments.length - pending
  const upcoming = appointments.find(item => new Date(item.scheduled_at).getTime() > now.getTime()) ?? null
  return { visits, pending, upcoming }
}

export function visitLabel(count: number): string {
  return count === 1 ? '1 atendimento' : `${count} atendimentos`
}

export function pendingLabel(count: number): string {
  return count === 1 ? '1 solicitação pendente' : `${count} solicitações pendentes`
}
