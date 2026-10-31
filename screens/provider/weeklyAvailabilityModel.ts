import { DayAvailability, WeekdayKey, emptyWeeklyAvailability } from '../../design-system/patterns/WeeklyAvailabilityEditor'

export type TravelGap = 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120

export type WeeklyDay = {
  enabled: boolean
  start: string | null
  end: string | null
  break_start: string | null
  break_end: string | null
}

export type WeeklyRoutine = {
  days: Record<WeekdayKey, WeeklyDay>
  travel_gap_minutes: TravelGap | null
  manual_fit: boolean
}

export type WeeklyDraft = {
  days: Record<WeekdayKey, DayAvailability>
  travelGap: TravelGap | null
  manualFit: boolean
}

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/

const DAY_NAMES: Record<WeekdayKey, string> = {
  mon: 'segunda-feira',
  tue: 'terça-feira',
  wed: 'quarta-feira',
  thu: 'quinta-feira',
  fri: 'sexta-feira',
  sat: 'sábado',
  sun: 'domingo',
}

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const minutes = (value: string | undefined): number | null => {
  if (!value?.trim()) return null
  const match = CLOCK.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function draftFromRoutine(routine: WeeklyRoutine): WeeklyDraft {
  const days = emptyWeeklyAvailability()
  for (const key of WEEKDAY_KEYS) {
    const day = routine.days[key]
    days[key] = day.enabled
      ? {
          enabled: true,
          start: day.start ?? '',
          end: day.end ?? '',
          breakStart: day.break_start ?? '',
          breakEnd: day.break_end ?? '',
        }
      : { enabled: false }
  }
  return {
    days,
    travelGap: routine.travel_gap_minutes,
    manualFit: routine.manual_fit,
  }
}

export function routinePayload(draft: WeeklyDraft) {
  const days = {} as Record<WeekdayKey, WeeklyDay>
  for (const key of WEEKDAY_KEYS) {
    const day = draft.days[key]
    days[key] = {
      enabled: day.enabled,
      start: day.start?.trim() ? day.start.trim() : null,
      end: day.end?.trim() ? day.end.trim() : null,
      break_start: day.breakStart?.trim() ? day.breakStart.trim() : null,
      break_end: day.breakEnd?.trim() ? day.breakEnd.trim() : null,
    }
  }
  return {
    days,
    travel_gap_minutes: draft.travelGap,
    manual_fit: draft.manualFit,
  }
}

export function dayIssues(draft: WeeklyDraft): Partial<Record<WeekdayKey, string>> {
  const issues: Partial<Record<WeekdayKey, string>> = {}
  for (const key of WEEKDAY_KEYS) {
    const day = draft.days[key]
    if (!day.enabled) continue
    const name = DAY_NAMES[key]
    const start = minutes(day.start)
    const end = minutes(day.end)
    if (start == null || end == null) {
      issues[key] = `Use o horário de ${name} no formato HH:MM.`
      continue
    }
    if (end <= start) {
      issues[key] = `O fim de ${name} precisa ser depois do início.`
      continue
    }
    const hasBreakStart = !!day.breakStart?.trim()
    const hasBreakEnd = !!day.breakEnd?.trim()
    if (hasBreakStart !== hasBreakEnd) {
      issues[key] = `Informe o início e o fim do intervalo de ${name}.`
      continue
    }
    if (!hasBreakStart) continue
    const breakStart = minutes(day.breakStart)
    const breakEnd = minutes(day.breakEnd)
    if (breakStart == null || breakEnd == null) {
      issues[key] = `Use o intervalo de ${name} no formato HH:MM.`
      continue
    }
    if (breakEnd <= breakStart || breakStart < start || breakEnd > end) {
      issues[key] = `O intervalo de ${name} precisa ficar dentro da jornada.`
    }
  }
  return issues
}

export function routineIssue(draft: WeeklyDraft): string | null {
  const issues = dayIssues(draft)
  for (const key of WEEKDAY_KEYS) {
    if (issues[key]) return issues[key] ?? null
  }
  if (draft.travelGap == null) return 'Escolha de 15 em 15 minutos, até 2 horas.'
  return null
}

export function upcomingMonday(now = new Date()): string {
  for (let offset = 0; offset < 7; offset += 1) {
    const probe = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(probe).map(part => [part.type, part.value]))
    if (parts.weekday === 'Mon' && parts.year && parts.month && parts.day) {
      return `${parts.year}-${parts.month}-${parts.day}`
    }
  }
  return '2026-11-02'
}

export function formatSlot(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatPreviewDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

export function sameRoutine(left: WeeklyDraft, right: WeeklyDraft): boolean {
  return JSON.stringify(routinePayload(left)) === JSON.stringify(routinePayload(right))
}
