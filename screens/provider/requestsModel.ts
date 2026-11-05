import { RequestGroupFilter } from '../../types/request.types'

const TIMEZONE = 'America/Sao_Paulo'

export const REQUEST_TABS: { id: RequestGroupFilter, label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'accepted', label: 'Aceitas' },
  { id: 'rejected', label: 'Recusadas' },
]

export const EMPTY_COPY: Record<RequestGroupFilter, string> = {
  all: 'Quando um tutor pedir um horário, a solicitação aparece aqui.',
  pending: 'Não há solicitações aguardando a sua resposta.',
  accepted: 'Você ainda não aceitou nenhuma solicitação.',
  rejected: 'Você ainda não recusou nenhuma solicitação.',
}

const dateParts = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// "Sáb, 13 de abril de 2024 às 10:00", sempre no fuso de São Paulo.
export function requestDateLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const read = (type: Intl.DateTimeFormatPartTypes) => dateParts.formatToParts(date).find(part => part.type === type)?.value ?? ''
  const weekday = read('weekday').replace('.', '')
  const head = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${head}, ${read('day')} de ${read('month')} de ${read('year')} às ${read('hour')}:${read('minute')}`
}

export function pendingTodayTitle(count: number): string {
  if (count === 0) return 'Nenhuma nova solicitação hoje'
  return count === 1 ? '1 nova solicitação hoje' : `${count} novas solicitações hoje`
}

export function pendingTodayHint(count: number): string {
  return count === 0
    ? 'Os pedidos que chegarem hoje aparecem aqui.'
    : 'Avalie os pedidos e responda o quanto antes para aumentar suas chances de agendamento.'
}
