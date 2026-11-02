import { Pressable, StyleSheet, View } from 'react-native'
import { Calendar, ChevronRight, MapPin } from 'lucide-react-native'
import { BookingStatus } from '../../types/booking.types'
import { formatMoney } from '../../utils/formatMoney'
import MGAvatar from '../components/MGAvatar'
import MGBadge, { MGBadgeTone } from '../components/MGBadge'
import MGIcon from '../components/MGIcon'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'
import BookingStatusBadge from './BookingStatusBadge'

const AGENDA_STATUS: Partial<Record<BookingStatus, { label: string, tone: MGBadgeTone }>> = {
  [BookingStatus.PENDING_CONFIRMATION]: { label: 'Pendente', tone: 'pending' },
  [BookingStatus.CONFIRMED]: { label: 'Confirmado', tone: 'confirmed' },
  [BookingStatus.EN_ROUTE]: { label: 'Em deslocamento', tone: 'info' },
}

function clock(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatScheduledAt(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export type AgendaAppointmentCardProps = {
  service_name?: string
  provider_name?: string
  customer_name?: string
  perspective?: 'customer' | 'provider'
  price?: number
  scheduled_at: string
  customer_location: string
  booking_status: BookingStatus
  showChevron?: boolean
  onPress?: () => void
  variant?: 'default' | 'groomer'
  pet_name?: string | null
  pet_photo_url?: string | null
}

export default function AgendaAppointmentCard({
  service_name,
  provider_name,
  customer_name,
  perspective = 'customer',
  price,
  scheduled_at,
  customer_location,
  booking_status,
  showChevron,
  onPress,
  variant = 'default',
  pet_name,
  pet_photo_url,
}: AgendaAppointmentCardProps) {
  const { colors, spacing, radius, fonts } = useMGTheme()
  if (variant === 'groomer') {
    const pet = pet_name?.trim() || 'Pet não informado'
    const status = AGENDA_STATUS[booking_status]
    const time = clock(scheduled_at)
    const tutor = customer_name?.trim() || 'Tutor não informado'
    const service = service_name?.trim() || 'Serviço'
    const address = customer_location?.trim() || 'Endereço não informado'
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${time}, ${pet}, ${status?.label ?? booking_status}, ${service}, ${tutor}`}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginBottom: spacing.sm,
            minHeight: 44,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <MGText variant="title" style={{ width: 64 }}>{time}</MGText>
        <View style={[styles.content, { gap: spacing.xs }]}>
          <View style={[styles.header, { gap: spacing.sm }]}>
            {pet_photo_url ? <MGAvatar uri={pet_photo_url} name={pet} kind="pet" size={44} /> : null}
            <MGText variant="title" numberOfLines={1} style={{ flex: 1 }}>{pet}</MGText>
            {status ? <MGBadge label={status.label} tone={status.tone} /> : <BookingStatusBadge status={booking_status} />}
          </View>
          <MGText variant="bodySmall" color="secondary" numberOfLines={1}>Tutor: {tutor}</MGText>
          <View style={[styles.row, { gap: spacing.sm }]}>
            <MGIcon name="scissors" size={16} color={colors.text.secondary} />
            <MGText variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>{service}</MGText>
          </View>
          <View style={[styles.row, { gap: spacing.sm }]}>
            <MGIcon name="map-pin" size={16} color={colors.text.secondary} />
            <MGText variant="bodySmall" color="secondary" numberOfLines={2} style={{ flex: 1 }}>{address}</MGText>
          </View>
        </View>
        <ChevronRight size={20} color={colors.text.secondary} />
      </Pressable>
    )
  }
  const partyLine =
    perspective === 'provider'
      ? `para ${customer_name ?? 'tutor'}`
      : `por ${provider_name ?? 'groomer'}`

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.default,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={[styles.content, { gap: spacing.xs }]}>
        <View style={[styles.header, { gap: spacing.sm, marginBottom: spacing.xs }]}>
          <MGText variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {service_name ?? 'Serviço'}
          </MGText>
          <BookingStatusBadge status={booking_status} />
        </View>
        <MGText variant="bodySmall" color="secondary">
          {partyLine}
        </MGText>
        {price != null ? (
          <MGText variant="bodySmall" style={{ fontFamily: fonts.bold }}>
            {formatMoney(price)}
          </MGText>
        ) : null}
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Calendar size={16} color={colors.text.secondary} />
          <MGText variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
            {formatScheduledAt(scheduled_at)}
          </MGText>
        </View>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <MapPin size={16} color={colors.text.secondary} />
          <MGText variant="bodySmall" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {customer_location}
          </MGText>
        </View>
      </View>
      {showChevron ? <ChevronRight size={20} color={colors.text.secondary} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
