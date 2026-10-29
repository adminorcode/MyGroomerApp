import { Pressable, StyleSheet, View } from 'react-native'
import { Calendar, ChevronRight, MapPin } from 'lucide-react-native'
import { BookingStatus } from '../../types/booking.types'
import { formatMoney } from '../../utils/formatMoney'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'
import BookingStatusBadge from './BookingStatusBadge'

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
}: AgendaAppointmentCardProps) {
  const { colors, spacing, radius } = useMGTheme()
  const partyLine =
    perspective === 'provider'
      ? `para ${customer_name ?? 'tutor'}${price != null ? ` · ${formatMoney(price)}` : ''}`
      : `por ${provider_name ?? 'groomer'}${price != null ? ` · ${formatMoney(price)}` : ''}`

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
