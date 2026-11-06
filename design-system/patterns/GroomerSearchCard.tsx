import { Pressable, StyleSheet, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import MGAvatar from '../components/MGAvatar'
import MGArtwork from '../components/MGArtwork'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type GroomerSearchCardProps = {
  name: string
  subtitle?: string
  ratingLabel?: string
  priceLabel?: string
  coverageLabel?: string
  photoUrl?: string | null
  onPress?: () => void
  showChevron?: boolean
}

export default function GroomerSearchCard({
  name,
  subtitle,
  ratingLabel,
  priceLabel,
  coverageLabel,
  photoUrl,
  onPress,
  showChevron = true,
}: GroomerSearchCardProps) {
  const { colors, spacing, radius, fonts, elevation } = useMGTheme()
  const meta = [priceLabel, coverageLabel, ratingLabel].filter(Boolean).join(' · ')
  const details = [coverageLabel, ratingLabel].filter(Boolean).join(' · ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${subtitle ?? meta}`}
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
      {photoUrl ? <MGAvatar name={name} uri={photoUrl} kind="person" size={64} /> : <View style={{ backgroundColor: colors.surface.pinkSubtle, borderRadius: radius.lg }}><MGArtwork name="poodle" width={72} height={80} /></View>}
      <View style={[styles.content, { marginLeft: spacing.md }]}>
        <MGText variant="title" numberOfLines={2}>
          {name}
        </MGText>
        {subtitle ? (
          <MGText variant="bodySmall" color="secondary" numberOfLines={2}>
            {subtitle}
          </MGText>
        ) : null}
        {priceLabel ? (
          <MGText variant="bodySmall" numberOfLines={1} style={{ marginTop: spacing.xs, fontFamily: fonts.bold }}>
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
})
