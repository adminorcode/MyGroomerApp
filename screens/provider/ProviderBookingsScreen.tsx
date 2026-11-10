import { useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGCard, MGChip, MGDisclosure, MGDisclosureChevron, MGEmptyState, MGErrorState, MGIcon, MGScreen, MGText } from '../../design-system/components'
import { AgendaAppointmentCard } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useCreateAgendaBlock, useDeleteAgendaBlock, useProviderAgenda } from '../../hooks/useAgenda'
import { ProviderBookingsStackParamList } from '../../navigation/types'
import { BookingStatus } from '../../types/booking.types'
import { AgendaAppointment, AgendaInterval } from '../../types/agenda.types'
import { getErrorMessage } from '../../utils/error'
import BlockTimeSheet from './BlockTimeSheet'
import {
  AgendaFilter,
  AgendaView,
  agendaSummary,
  clockInSaoPaulo,
  dayHeading,
  initialBlockDate,
  pendingLabel,
  periodWindow,
  saoPauloDate,
  visitLabel,
} from './agendaPeriod'

type Props = {
  navigation: StackNavigationProp<ProviderBookingsStackParamList, 'ProviderBookings'>
}

const VIEWS: { id: AgendaView, label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
]

const FILTERS: { id: AgendaFilter, label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pending_confirmation', label: 'Pendente' },
  { id: 'confirmed', label: 'Confirmado' },
  { id: 'en_route', label: 'Em deslocamento' },
]

type Row =
  | { key: string, at: string, kind: 'appointment', appointment: AgendaAppointment }
  | { key: string, at: string, kind: 'block', interval: AgendaInterval }
  | { key: string, at: string, kind: 'manual', interval: AgendaInterval }

export default function ProviderBookingsScreen({ navigation }: Props) {
  const { colors, spacing } = useMGTheme()
  const [view, setView] = useState<AgendaView>('today')
  const [filter, setFilter] = useState<AgendaFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)
  const window = useMemo(() => periodWindow(view), [view])
  const agenda = useProviderAgenda(window.from, window.to)
  const createBlock = useCreateAgendaBlock()
  const removeBlock = useDeleteAgendaBlock()
  const appointments = agenda.data?.appointments ?? []
  const blocks = agenda.data?.blocks ?? []
  const manuals = agenda.data?.manual_appointments ?? []
  const summary = agendaSummary(appointments)
  const filtered = filter === 'all' ? appointments : appointments.filter(item => item.booking_status === filter)
  const rows = useMemo(() => {
    const next: Row[] = filtered.map(appointment => ({
      key: `appointment-${appointment.id}`,
      at: appointment.scheduled_at,
      kind: 'appointment',
      appointment,
    }))
    if (filter === 'all') {
      blocks.forEach(interval => next.push({ key: `block-${interval.id}`, at: interval.starts_at, kind: 'block', interval }))
      manuals.forEach(interval => next.push({ key: `manual-${interval.id}`, at: interval.starts_at, kind: 'manual', interval }))
    }
    next.sort((left, right) => left.at.localeCompare(right.at))
    return next
  }, [filtered, blocks, manuals, filter])
  const today = saoPauloDate(new Date())
  const groups = useMemo(() => {
    if (view === 'today') return [{ key: 'today', title: null as string | null, rows }]
    const grouped = new Map<string, Row[]>()
    rows.forEach(row => {
      const day = saoPauloDate(new Date(row.at))
      grouped.set(day, [...(grouped.get(day) ?? []), row])
    })
    return [...grouped.entries()].map(([day, items]) => ({ key: day, title: dayHeading(day, today), rows: items }))
  }, [rows, view, today])
  const periodEmpty = appointments.length === 0 && blocks.length === 0 && manuals.length === 0
  const filterEmpty = filter !== 'all' && filtered.length === 0
  const loading = agenda.isLoading || (agenda.isFetching && !agenda.data)

  const confirmBlock = async (starts_at: string, ends_at: string) => {
    setBlockError(null)
    try {
      await createBlock.mutateAsync({ starts_at, ends_at })
      setSheetOpen(false)
    } catch (error) {
      setBlockError(getErrorMessage(error))
    }
  }

  return (
    <MGScreen
      header="teal"
      headerSlot={<MGText variant="heading2" color="inverse" accessibilityRole="header">Agenda do groomer</MGText>}
    >
      <View style={{ flex: 1, width: '100%', maxWidth: 720, paddingTop: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {VIEWS.map(item => (
            <View key={item.id} style={{ flex: 1 }}>
              <MGChip
                label={item.label}
                density="compact"
                selected={view === item.id}
                minHeight={44}
                onPress={() => setView(item.id)}
              />
            </View>
          ))}
        </View>

        {view === 'today' && agenda.data ? (
          <MGCard variant="teal" padding={spacing.md} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View accessible accessibilityLabel={visitLabel(summary.visits)} style={{ flex: 1, gap: spacing.xs }}>
                <MGIcon name="calendar-days" color={colors.action.secondary} />
                <MGText variant="title">{summary.visits}</MGText>
                <MGText variant="caption">{summary.visits === 1 ? 'atendimento' : 'atendimentos'}</MGText>
              </View>
              <View accessible accessibilityLabel={pendingLabel(summary.pending)} style={{ flex: 1, gap: spacing.xs }}>
                <MGIcon name="file-text" color={colors.feedback.warning} />
                <MGText variant="title">{summary.pending}</MGText>
                <MGText variant="caption">{summary.pending === 1 ? 'solicitação pendente' : 'solicitações pendentes'}</MGText>
              </View>
              <View accessible accessibilityLabel={summary.upcoming ? `Próximo às ${clockInSaoPaulo(summary.upcoming.scheduled_at)}, ${summary.upcoming.service_name ?? 'serviço'}` : 'Não há próximo horário'} style={{ flex: 1, gap: spacing.xs }}>
                <MGIcon name="clock-3" color={colors.action.secondary} />
                {summary.upcoming ? <MGText variant="caption">próximo às</MGText> : null}
                <MGText variant="title">{summary.upcoming ? clockInSaoPaulo(summary.upcoming.scheduled_at) : '—'}</MGText>
                <MGText variant="caption" numberOfLines={2}>{summary.upcoming ? (summary.upcoming.service_name ?? 'Serviço') : 'Não há próximo horário'}</MGText>
              </View>
            </View>
          </MGCard>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm }}>
          <MGText variant="title" style={{ flex: 1 }}>{window.label}</MGText>
          <MGButton
            label="Filtrar"
            variant="secondary"
            fullWidth={false}
            onPress={() => setFiltersOpen(open => !open)}
            accessibilityState={{ expanded: filtersOpen }}
            aria-expanded={filtersOpen}
            aria-controls={filtersOpen ? 'agenda-filter-panel' : undefined}
            iconRight={<MGDisclosureChevron expanded={filtersOpen} size={16} color={colors.action.primaryOutline} />}
          />
        </View>
        <MGDisclosure open={filtersOpen} nativeID="agenda-filter-panel">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {FILTERS.map(item => (
              <MGChip
                key={item.id}
                label={item.label}
                selected={filter === item.id}
                minHeight={44}
                onPress={() => setFilter(item.id)}
              />
            ))}
          </View>
        </MGDisclosure>

        {loading ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Carregando agenda" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.action.primary} />
          </View>
        ) : agenda.isError ? (
          <MGErrorState message="Não foi possível carregar a agenda." onRetry={() => { void agenda.refetch() }} />
        ) : periodEmpty ? (
          <MGEmptyState title="Nenhum atendimento" description="Não há atendimentos no período." />
        ) : filterEmpty ? (
          <MGEmptyState title="Nenhum atendimento" description="O filtro não encontrou atendimentos." />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
            {groups.map(group => (
              <View key={group.key}>
                {group.title ? <MGText variant="label" style={{ marginBottom: spacing.sm, marginTop: spacing.sm }}>{group.title}</MGText> : null}
                {group.rows.map(row => {
                  if (row.kind === 'appointment') {
                    const item = row.appointment
                    return (
                      <AgendaAppointmentCard
                        key={row.key}
                        variant="groomer"
                        scheduled_at={item.scheduled_at}
                        booking_status={item.booking_status as BookingStatus}
                        customer_name={item.customer_name ?? undefined}
                        customer_location={item.customer_location ?? ''}
                        service_name={item.service_name ?? undefined}
                        pet_name={item.pet_name}
                        pet_photo_url={item.pet_photo_url}
                        onPress={() => navigation.navigate('ProviderBookingDetail', { bookingId: item.id })}
                      />
                    )
                  }
                  const start = clockInSaoPaulo(row.interval.starts_at)
                  const end = clockInSaoPaulo(row.interval.ends_at)
                  const title = row.kind === 'block' ? 'Horário bloqueado' : 'Encaixe manual'
                  return (
                    <MGCard key={row.key} padding={spacing.md} style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
                      <MGText variant="title">{title}</MGText>
                      <MGText variant="bodySmall" color="secondary">{start} – {end}</MGText>
                      {row.kind === 'block' ? (
                        <MGButton
                          label="Desbloquear"
                          variant="secondary"
                          fullWidth={false}
                          loading={removeBlock.isPending && removeBlock.variables === row.interval.id}
                          accessibilityLabel={`Desbloquear ${start}`}
                          onPress={() => { void removeBlock.mutateAsync(row.interval.id) }}
                        />
                      ) : null}
                    </MGCard>
                  )
                })}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.base }}>
          {blockError ? <MGText variant="caption" color="error" style={{ marginBottom: spacing.sm }}>{blockError}</MGText> : null}
          <MGButton label="Bloquear horário" onPress={() => { setBlockError(null); setSheetOpen(true) }} />
        </View>
        <BlockTimeSheet
          visible={sheetOpen}
          initialDate={initialBlockDate(window.from, window.to)}
          submitting={createBlock.isPending}
          onClose={() => setSheetOpen(false)}
          onConfirm={(starts, ends) => { void confirmBlock(starts, ends) }}
        />
      </View>
    </MGScreen>
  )
}
