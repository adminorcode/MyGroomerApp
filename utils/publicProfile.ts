import { formatRating } from './formatRating'
import { PublicProfileScheduleDay } from '../types/provider.types'

// A API numera os dias como a rotina semanal: 0 = segunda-feira ... 6 = domingo.
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const WEEKDAY_NAMES = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']

export function weekdayLabel(weekday: number) {
  return WEEKDAY_LABELS[weekday] ?? ''
}

export function weekdayName(weekday: number) {
  return WEEKDAY_NAMES[weekday] ?? ''
}

export function scheduleDays(schedule?: PublicProfileScheduleDay[] | null) {
  return [...(schedule ?? [])].sort((left, right) => left.weekday - right.weekday)
}

export function scheduleText(day: PublicProfileScheduleDay) {
  return `${day.start} às ${day.end}`
}

export function profileRatingLabel(average?: number | string | null, count?: number) {
  const rating = formatRating(average)
  if (rating === 'Sem avaliações') return rating
  const reviews = count === 1 ? '1 avaliação' : `${count ?? 0} avaliações`
  return `Avaliação ${rating} · ${reviews}`
}

export function areaRadiusLabel(radiusKm: number) {
  return `Raio de até ${radiusKm} km`
}
