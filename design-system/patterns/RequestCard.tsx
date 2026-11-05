import { Pressable, StyleSheet, View } from 'react-native'
import { RequestGroup } from '../../types/request.types'
import { formatMoney } from '../../utils/formatMoney'
import MGAvatar from '../components/MGAvatar'
import MGBadge, { MGBadgeTone } from '../components/MGBadge'
import MGButton from '../components/MGButton'
import MGCard from '../components/MGCard'
import MGDivider from '../components/MGDivider'
import MGIcon from '../components/MGIcon'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

const STATUS: Record<RequestGroup, { label: string, tone: MGBadgeTone }> = {
  pending: { label: 'Pendente', tone: 'pending' },
  accepted: { label: 'Aceita', tone: 'confirmed' },
  rejected: { label: 'Recusada', tone: 'neutral' },
}

export type RequestCardProps = {
  petName?: string | null
  petPhotoUrl?: string | null
  customerName?: string | null
  serviceName?: string | null
  scheduledAtLabel: string
  location?: string | null
  price?: number | null
  group: RequestGroup
  /** Qual resposta está em envio. Os dois botões ficam bloqueados enquanto houver uma. */
  responding?: 'accept' | 'reject' | null
  /** Outra solicitação está sendo respondida: bloqueia os botões desta. */
  blocked?: boolean
  onAccept?: () => void
  onReject?: () => void
  onPress?: () => void
}

export default function RequestCard({
  petName,
  petPhotoUrl,
  customerName,
  serviceName,
  scheduledAtLabel,
  location,
  price,
  group,
  responding = null,
  blocked = false,
  onAccept,
  onReject,
  onPress,
}: RequestCardProps) {
  const { colors, spacing } = useMGTheme()
  const pet = petName?.trim() || 'Pet não informado'
  const tutor = customerName?.trim() || 'Tutor não informado'
  const service = serviceName?.trim() || 'Serviço'
  const address = location?.trim() || 'Endereço não informado'
  const status = STATUS[group]
  const canRespond = group === 'pending' && Boolean(onAccept && onReject)

  const card = (
      <MGCard padding={spacing.md}>
        <View style={[styles.top, { gap: spacing.md }]}>
          <MGAvatar uri={petPhotoUrl} name={pet} kind="pet" size={64} />
          <View style={[styles.details, { gap: spacing.xs }]}>
            <View style={[styles.titleRow, { gap: spacing.sm }]}>
              <MGText variant="title" numberOfLines={2} style={{ flex: 1 }}>{pet}</MGText>
              <MGBadge label={status.label} tone={status.tone} />
            </View>
            <MGText variant="bodySmall" color="secondary" numberOfLines={1}>Tutor: {tutor}</MGText>
            <View style={[styles.line, { gap: spacing.sm }]}>
              <MGIcon name="scissors" size={16} color={colors.action.primary} />
              <MGText variant="bodySmall" style={styles.lineText}>{service}</MGText>
            </View>
            <View style={[styles.line, { gap: spacing.sm }]}>
              <MGIcon name="calendar-days" size={16} color={colors.action.primary} />
              <MGText variant="bodySmall" style={styles.lineText}>{scheduledAtLabel}</MGText>
            </View>
            <View style={[styles.line, { gap: spacing.sm }]}>
              <MGIcon name="map-pin" size={16} color={colors.action.primary} />
              <MGText variant="bodySmall" color="secondary" style={styles.lineText}>{address}</MGText>
            </View>
          </View>
        </View>
        <MGDivider spacing={spacing.md} />
        <View style={[styles.footer, { gap: spacing.md }]}>
          <View style={styles.price}>
            <MGText variant="caption" color="secondary">Valor estimado</MGText>
            <MGText variant="title">{price == null ? 'Valor não informado' : formatMoney(price)}</MGText>
          </View>
          {canRespond ? (
            <View style={[styles.actions, { gap: spacing.sm }]}>
              <MGButton
                label="Recusar"
                accessibilityLabel={`Recusar solicitação de ${pet}, ${scheduledAtLabel}`}
                variant="secondary"
                fullWidth={false}
                style={styles.button}
                loading={responding === 'reject'}
                disabled={responding !== null || blocked}
                onPress={onReject}
              />
              <MGButton
                label="Aceitar"
                accessibilityLabel={`Aceitar solicitação de ${pet}, ${scheduledAtLabel}`}
                fullWidth={false}
                style={styles.button}
                loading={responding === 'accept'}
                disabled={responding !== null || blocked}
                onPress={onAccept}
              />
            </View>
          ) : null}
        </View>
      </MGCard>
  )

  return (
    <View role="article" aria-label={`Solicitação de ${pet}, ${scheduledAtLabel}`} style={{ marginBottom: spacing.md }}>
      {onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress}>
          {card}
        </Pressable>
      ) : card}
    </View>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  details: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  line: { flexDirection: 'row', alignItems: 'flex-start' },
  lineText: { flex: 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  price: { flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  // Largura fixa: o botão não encolhe para o spinner enquanto a resposta é enviada.
  button: { minWidth: 104 },
})
