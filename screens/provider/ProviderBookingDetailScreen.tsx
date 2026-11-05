import { AppAlert } from '../../utils/alert'
import { ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import {
  Bone,
  Cake,
  Clock3,
  Coins,
  Dog,
  FileText,
  LucideIcon,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react-native'
import { CompositeNavigationProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import {
  ProviderBookingsStackParamList,
  ProviderRequestsStackParamList,
  RootParamList,
} from '../../navigation/types'
import {
  useChangeBookingStatus,
  useGetBookingById,
  useOpenBookingConversation,
} from '../../hooks/useBooking'
import { MGButton, MGCard, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import { BookingStatusBadge } from '../../design-system/patterns'
import MGAvatar from '../../design-system/components/MGAvatar'
import { BookingStatus } from '../../types/booking.types'
import { formatMoney } from '../../utils/formatMoney'
import { formatDisplayPhone } from '../../utils/formatPhone'
import { petSizeLabel } from '../../types/pet.types'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useState } from 'react'
import RescheduleBookingSheet from './RescheduleBookingSheet'
import { getErrorMessage } from '../../utils/error'

type DetailRoute = RouteProp<
  ProviderBookingsStackParamList | ProviderRequestsStackParamList,
  'ProviderBookingDetail'
>
type DetailNav = CompositeNavigationProp<
  StackNavigationProp<ProviderBookingsStackParamList | ProviderRequestsStackParamList, 'ProviderBookingDetail'>,
  StackNavigationProp<RootParamList>
>

type Props = {
  navigation: DetailNav
  route: DetailRoute
}

const timezone = 'America/Sao_Paulo'

/** G08: gancho do loop — âncora no início (Hoje ou data) + hora + fechamento entre parênteses. */
function formatScheduledSummary(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const now = new Date()
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(p => [p.type, p.value]))
  const valueParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(p => [p.type, p.value]))
  const isToday = todayParts.year === valueParts.year
    && todayParts.month === valueParts.month
    && todayParts.day === valueParts.day
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(date)
  const longDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
  }).format(date)
  return `${isToday ? 'Hoje' : longDate}, ${time} (${longDate})`
}

function formatDuration(minutes?: number | null) {
  if (minutes == null || !Number.isFinite(minutes)) return 'Duração não informada'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours <= 0) return `${mins} min`
  return `${hours}h${String(mins).padStart(2, '0')}`
}

function formatAge(years?: number | null) {
  if (years == null || !Number.isFinite(years)) return 'Idade não informada'
  if (years === 1) return '1 ano'
  return `${years} anos`
}

type SectionProps = {
  icon: MGIconName
  title: string
  children: ReactNode
}

type MGIconName = Parameters<typeof MGIcon>[0]['name']

function DetailSection({ icon, title, children }: SectionProps) {
  const { colors, spacing } = useMGTheme()
  return (
    <MGCard padding={spacing.md} style={{ marginBottom: spacing.md }}>
      <View style={[styles.sectionHead, { gap: spacing.sm, marginBottom: spacing.md }]}>
        <MGIcon name={icon} size={20} color={colors.action.primary} />
        <MGText variant="title">{title}</MGText>
      </View>
      {children}
    </MGCard>
  )
}

type FactProps = { icon: LucideIcon, label: string, value: string, style?: StyleProp<ViewStyle> }

function DetailFact({ icon: Icon, label, value, style }: FactProps) {
  const { colors, spacing } = useMGTheme()
  return (
    <View style={[styles.fact, { gap: spacing.sm }, style]}>
      <Icon size={18} color={colors.action.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <MGText variant="caption" color="secondary">{label}</MGText>
        <MGText variant="body">{value}</MGText>
      </View>
    </View>
  )
}

export default function ProviderBookingDetailScreen({ navigation, route }: Props) {
  const { bookingId } = route.params
  const { colors, spacing } = useMGTheme()
  const { data, isLoading, isError, refetch } = useGetBookingById(bookingId)
  const changeStatus = useChangeBookingStatus()
  const openConversation = useOpenBookingConversation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

    const screenHeader = (
        <View style={[styles.header, { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} hitSlop={8}>
                <MGIcon name="arrow-left" size={24} color={colors.action.primary} />
            </Pressable>
            <MGText variant="heading2" accessibilityRole="header" style={{ flex: 1 }}>Detalhes do agendamento</MGText>
        </View>
    )

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.surface.canvas, alignItems: 'center' }}>
                <View style={{ flex: 1, width: '100%', maxWidth: 720 }}>
                    {screenHeader}
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.action.primary} accessibilityLabel="Carregando detalhes do agendamento" />
                    </View>
                </View>
            </View>
        )
    }

    if (isError || !data) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.surface.canvas, alignItems: 'center' }}>
                <View style={{ flex: 1, width: '100%', maxWidth: 720, paddingHorizontal: spacing.base }}>
                    {screenHeader}
                    <View style={[styles.centered, { paddingHorizontal: spacing.lg }]}>
                        <MGErrorState message="Não foi possível carregar este agendamento." onRetry={() => { void refetch() }} />
                    </View>
                </View>
            </View>
        )
    }

  const petName = data.pet_name?.trim() || 'Pet não informado'
  const tutor = data.customer_name?.trim() || 'Tutor não informado'
  const canRespond = data.booking_status === BookingStatus.PENDING_CONFIRMATION
  const canReschedule = data.booking_status === BookingStatus.PENDING_CONFIRMATION
    || data.booking_status === BookingStatus.CONFIRMED
  const showProgressAction = data.booking_status === BookingStatus.CONFIRMED
    || data.booking_status === BookingStatus.IN_PROGRESS

  const progressAction = data.booking_status === BookingStatus.CONFIRMED
    ? { label: 'Iniciar atendimento', next: BookingStatus.IN_PROGRESS }
    : data.booking_status === BookingStatus.IN_PROGRESS
      ? { label: 'Concluir atendimento', next: BookingStatus.COMPLETED }
      : null

  const runStatus = async (next: BookingStatus) => {
    setActionError(null)
    try {
      await changeStatus.mutateAsync({ bookingId, booking_status: next })
      if (next === BookingStatus.CANCELLED || next === BookingStatus.CONFIRMED) {
        navigation.goBack()
      }
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  const handleChat = async () => {
    setActionError(null)
    try {
      const response = await openConversation.mutateAsync(bookingId)
      const conversation = response.data
      navigation.navigate('Chat', { conversationId: conversation.id, otherName: data.customer_name })
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.canvas, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720 }}>
        {screenHeader}

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
          <MGCard padding={spacing.md} style={{ marginBottom: spacing.md }}>
            <View style={[styles.hero, { gap: spacing.md }]}>
              <MGAvatar name={petName} kind="pet" size={72} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <View style={styles.heroTitle}>
                  <MGText variant="title" style={{ flex: 1 }}>{petName}</MGText>
                  <BookingStatusBadge status={data.booking_status} />
                </View>
                <MGText variant="bodySmall" color="secondary">Tutor: {tutor}</MGText>
                <View style={[styles.line, { gap: spacing.sm }]}>
                  <MGIcon name="scissors" size={16} color={colors.action.primary} />
                  <MGText variant="bodySmall" style={{ flex: 1 }}>{data.service_name}</MGText>
                </View>
                <View style={[styles.line, { gap: spacing.sm }]}>
                  <MGIcon name="calendar-days" size={16} color={colors.action.primary} />
                  <MGText variant="bodySmall" style={{ flex: 1 }}>{formatScheduledSummary(data.scheduled_at)}</MGText>
                </View>
                <View style={[styles.line, { gap: spacing.sm }]}>
                  <MGIcon name="map-pin" size={16} color={colors.text.secondary} />
                  <MGText variant="bodySmall" color="secondary" style={{ flex: 1 }}>{data.customer_location}</MGText>
                </View>
              </View>
            </View>
          </MGCard>

          <DetailSection icon="paw-print" title="Dados do pet">
            <View style={[styles.grid, { gap: spacing.md }]}>
              <DetailFact icon={Dog} label="Porte" value={data.pet_size ? petSizeLabel(data.pet_size) : 'Não informado'} style={styles.factGridItem} />
              <DetailFact icon={Bone} label="Raça" value={data.pet_breed?.trim() || 'Não informada'} style={styles.factGridItem} />
              <DetailFact icon={Cake} label="Idade" value={formatAge(data.pet_age_years)} style={styles.factGridItem} />
              <DetailFact icon={FileText} label="Observações" value={data.pet_notes?.trim() || 'Nenhuma observação'} style={styles.factGridItem} />
            </View>
          </DetailSection>

          <DetailSection icon="badge-check" title="Dados do tutor">
            <View style={[styles.twoColumns, { gap: spacing.md }]}>
              <View style={styles.column}>
                <DetailFact icon={Phone} label="Telefone" value={formatDisplayPhone(data.customer_phone)} />
              </View>
              <View style={styles.column}>
                <DetailFact icon={MapPin} label="Endereço" value={data.customer_location?.trim() || 'Endereço não informado'} />
              </View>
            </View>
          </DetailSection>

          <DetailSection icon="scissors" title="Serviço solicitado">
            <View style={[styles.twoColumns, { gap: spacing.md }]}>
              <View style={styles.column}>
                <DetailFact icon={FileText} label="Serviço" value={data.service_name} />
              </View>
              <View style={[styles.column, { gap: spacing.md }]}>
                <DetailFact icon={Clock3} label="Duração estimada" value={formatDuration(data.duration_minutes)} />
                <DetailFact icon={Coins} label="Valor" value={formatMoney(data.price)} />
              </View>
            </View>
          </DetailSection>

          {actionError ? (
            <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={{ marginBottom: spacing.md }}>{actionError}</MGText>
          ) : null}

          {canRespond ? (
            <MGButton
              label="Aceitar agendamento"
              iconLeft={<MGIcon name="check" size={18} color={colors.text.inverse} />}
              onPress={() => { void runStatus(BookingStatus.CONFIRMED) }}
              loading={changeStatus.isPending}
              disabled={changeStatus.isPending}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {showProgressAction && progressAction ? (
            <MGButton
              label={progressAction.label}
              onPress={() => {
                if (progressAction.next === BookingStatus.COMPLETED) {
                  AppAlert.alert(
                    'Concluir o atendimento?',
                    'Isso encerra o agendamento. Esta ação não pode ser desfeita.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: progressAction.label, onPress: () => { void runStatus(progressAction.next) } },
                    ],
                  )
                  return
                }
                void runStatus(progressAction.next)
              }}
              loading={changeStatus.isPending}
              disabled={changeStatus.isPending}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          <View style={[styles.rowActions, { gap: spacing.sm, marginBottom: spacing.sm }]}>
            {canReschedule ? (
              <MGButton
                label="Reagendar"
                variant="secondary"
                iconLeft={<MGIcon name="calendar-days" size={18} color={colors.action.primaryOutline} />}
                fullWidth={false}
                style={styles.halfButton}
                onPress={() => setSheetOpen(true)}
                disabled={changeStatus.isPending}
              />
            ) : null}
            <MGButton
              label="Falar com tutor"
              variant="teal"
              iconLeft={<MessageCircle size={18} color={colors.onAction.secondary} />}
              fullWidth={false}
              style={styles.halfButton}
              onPress={() => { void handleChat() }}
              loading={openConversation.isPending}
              disabled={openConversation.isPending || changeStatus.isPending}
            />
          </View>

          {canRespond ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => { void runStatus(BookingStatus.CANCELLED) }}
              disabled={changeStatus.isPending}
              style={{ alignItems: 'center', paddingVertical: spacing.sm }}
            >
              <MGText variant="body" color="brand">Recusar agendamento</MGText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      <RescheduleBookingSheet
        visible={sheetOpen}
        bookingId={bookingId}
        providerServiceId={data.provider_service_id}
        petId={data.pet_id}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => { void refetch() }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-start' },
  heroTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  twoColumns: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0 },
  fact: { flexDirection: 'row', alignItems: 'flex-start' },
  factGridItem: { width: '48%', minWidth: 140 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap' },
  halfButton: { flex: 1, minWidth: 140 },
})
