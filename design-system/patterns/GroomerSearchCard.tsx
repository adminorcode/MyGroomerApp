import { Pressable, StyleSheet, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import MGAvatar from '../components/MGAvatar'
import MGButton from '../components/MGButton'
import MGIcon from '../components/MGIcon'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type GroomerSearchCardProps = {
  name: string
  subtitle?: string
  /** Serviços do groomer que atendem à busca, listados no cartão. */
  services?: string[]
  ratingLabel?: string
  priceLabel?: string
  coverageLabel?: string
  photoUrl?: string | null
  onPress?: () => void
  showChevron?: boolean
  variant?: 'compact' | 'discovery'
  verified?: boolean
  reviewCount?: number
  distanceLabel?: string
  availabilityLabel?: string
  homeLabel?: string
  favorite?: boolean
  onFavorite?: () => void
}

export default function GroomerSearchCard({
  name,
  subtitle,
  services,
  ratingLabel,
  priceLabel,
  coverageLabel,
  photoUrl,
  onPress,
  showChevron = true,
  variant = 'compact',
  verified = false,
  reviewCount = 0,
  distanceLabel,
  availabilityLabel,
  homeLabel,
  favorite = false,
  onFavorite,
}: GroomerSearchCardProps) {
  const { colors, spacing, radius, fonts, elevation } = useMGTheme()
  if (variant === 'discovery') {
    const ratingText = ratingLabel
      ? `${ratingLabel}${reviewCount > 0 ? ` (${reviewCount} ${reviewCount === 1 ? 'avaliação' : 'avaliações'})` : ''}`
      : undefined
    return (
      <View
        style={[
          styles.card,
          elevation.low,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginBottom: spacing.md,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: spacing.sm,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <MGAvatar name={name} uri={photoUrl} kind="person" size={80} height={104} shape="rounded" tone="teal" />
        <View style={[styles.content, { gap: spacing.xs }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <MGText variant="title" numberOfLines={2} style={{ flexShrink: 1 }}>{name}</MGText>
              {verified ? <MGIcon name="badge-check" size={18} color={colors.action.primaryText} accessibilityLabel="Verificado" decorative={false} /> : null}
            </View>
            {onFavorite ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Favoritar'}
                accessibilityState={{ selected: favorite }}
                onPress={onFavorite}
                style={({ pressed }) => [styles.iconHit, { opacity: pressed ? 0.6 : 1 }]}
              >
                <MGIcon name="heart" size={24} color={colors.action.primaryText} fill={favorite ? colors.action.primaryText : 'none'} />
              </Pressable>
            ) : null}
          </View>
          {services && services.length > 0 ? (
            <MGText variant="bodySmall" color="secondary" numberOfLines={2}>{services.join(' · ')}</MGText>
          ) : null}
          <View style={[styles.metaRow, { flexWrap: 'wrap', gap: spacing.sm }]}>
            <View style={{ flex: 1, minWidth: 112, gap: spacing.xs }}>
              {ratingText ? (
                <View style={styles.inline}>
                  <MGIcon name="star" size={14} color={colors.feedback.warning} fill={colors.feedback.warning} />
                  <MGText variant="caption">{ratingText}</MGText>
                </View>
              ) : null}
              {distanceLabel ? (
                <View style={styles.inline}>
                  <MGIcon name="map-pin" size={14} color={colors.action.primaryText} />
                  <MGText variant="caption" color="secondary">{distanceLabel}</MGText>
                </View>
              ) : null}
            </View>
            {priceLabel ? (
              <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <MGText variant="caption" color="secondary">A partir de</MGText>
                <MGText variant="heading3" style={{ color: colors.brand.teal, fontFamily: fonts.bold }}>{priceLabel}</MGText>
              </View>
            ) : null}
          </View>
        </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing.sm }}>
          <View style={[styles.badges, { flex: 1, minWidth: 120 }]}>
            {availabilityLabel ? <Badge label={availabilityLabel} icon={availabilityLabel === 'Disponível hoje' ? 'zap' : 'calendar-days'} tone="availability" /> : null}
            {homeLabel ? <Badge label={homeLabel} icon="house" tone="neutral" /> : null}
          </View>
          {onPress ? (
            <MGButton
              label="Ver perfil"
              accessibilityLabel={`Ver perfil de ${name}`}
              fullWidth={false}
              onPress={onPress}
              style={{ minHeight: 48, paddingHorizontal: spacing.base, borderRadius: radius.pill }}
            />
          ) : null}
        </View>
      </View>
    )
  }
  const meta = [priceLabel, coverageLabel, ratingLabel].filter(Boolean).join(' · ')
  const details = [coverageLabel, ratingLabel].filter(Boolean).join(' · ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[`${name}`, subtitle, services && services.length > 0 ? services.join(', ') : null, meta].filter(Boolean).join('. ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        elevation.low,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.default,
          borderRadius: radius.lg,
          padding: spacing.base,
          marginBottom: spacing.sm,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* CMP-11 / R3: avatar do profissional em teal sólido, com texto branco. */}
      <MGAvatar name={name} uri={photoUrl} kind="person" size={64} tone="teal" />
      <View style={[styles.content, { marginLeft: spacing.md }]}>
        <MGText variant="title" numberOfLines={2}>
          {name}
        </MGText>
        {subtitle ? (
          <MGText variant="bodySmall" color="secondary" numberOfLines={2}>
            {subtitle}
          </MGText>
        ) : null}
        {services && services.length > 0 ? (
          <MGText variant="bodySmall" numberOfLines={2} style={{ marginTop: spacing.xs }}>
            {services.join(' · ')}
          </MGText>
        ) : null}
        {priceLabel ? (
          <MGText variant="bodySmall" color="teal" numberOfLines={1} style={{ marginTop: spacing.xs, fontFamily: fonts.bold }}>
            {priceLabel}
          </MGText>
        ) : null}
        {details ? (
          <MGText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
            {details}
          </MGText>
        ) : null}
      </View>
      {showChevron ? <ChevronRight size={20} color={colors.text.secondary} /> : null}
    </Pressable>
  )
}

function Badge({ label, icon, tone }: { label: string, icon: 'calendar-days' | 'house' | 'zap', tone: 'availability' | 'neutral' }) {
  const { colors, spacing, radius } = useMGTheme()
  const availability = tone === 'availability'
  const color = availability ? colors.feedback.success : colors.text.primary
  return (
    <View style={[styles.badge, {
      backgroundColor: availability ? colors.feedback.successSurface : colors.surface.canvas,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      gap: spacing.xs,
      maxWidth: '100%',
    }]}>
      <MGIcon name={icon} size={14} color={color} />
      <MGText variant="caption" style={{ color, flexShrink: 1 }}>{label}</MGText>
    </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconHit: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
