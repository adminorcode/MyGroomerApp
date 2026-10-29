import { StyleSheet, View } from 'react-native'
import { BookingStatus } from '../../types/booking.types'
import { formatMoney } from '../../utils/formatMoney'
import MGButton from '../components/MGButton'
import MGCard from '../components/MGCard'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'
import BookingStatusBadge from './BookingStatusBadge'

type Props = {
  serviceName: string
  customerName?: string
  scheduledAtLabel: string
  location: string
  price?: number
  status: BookingStatus
  onAccept?: () => void
  onReject?: () => void
  onPressDetail?: () => void
  accepting?: boolean
  rejecting?: boolean
}

export default function RequestCard({
  serviceName,
  customerName,
  scheduledAtLabel,
  location,
  price,
  status,
  onAccept,
  onReject,
  onPressDetail,
  accepting,
  rejecting,
}: Props) {
  const { spacing } = useMGTheme()
  const canRespond =
    status === BookingStatus.PENDING_CONFIRMATION || status === BookingStatus.PENDING_PAYMENT

  return (
    <MGCard onPress={onPressDetail} accessibilityLabel={`Pedido ${serviceName}`}>
      <View style={[styles.header, { marginBottom: spacing.sm, gap: spacing.sm }]}>
        <MGText variant="title" style={{ flex: 1 }} numberOfLines={1}>
          {serviceName}
        </MGText>
        <BookingStatusBadge status={status} />
      </View>
      {customerName ? (
        <MGText variant="bodySmall" color="secondary">
          Tutor: {customerName}
        </MGText>
      ) : null}
      <MGText variant="bodySmall">{scheduledAtLabel}</MGText>
      <MGText variant="bodySmall" color="secondary">
        {location}
      </MGText>
      {price != null ? (
        <MGText variant="title" color="brand" style={{ marginTop: spacing.sm }}>
          {formatMoney(price)}
        </MGText>
      ) : null}
      {canRespond && (onAccept || onReject) ? (
        <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.md }]}>
          {onReject ? (
            <View style={styles.action}>
              <MGButton
                label="Recusar"
                variant="destructive"
                loading={rejecting}
                onPress={onReject}
              />
            </View>
          ) : null}
          {onAccept ? (
            <View style={styles.action}>
              <MGButton label="Aceitar" loading={accepting} onPress={onAccept} />
            </View>
          ) : null}
        </View>
      ) : null}
    </MGCard>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  action: {
    flex: 1,
  },
})
