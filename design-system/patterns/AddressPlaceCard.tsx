import { ReactNode } from 'react'
import { View } from 'react-native'
import MGCard from '../components/MGCard'
import MGIcon from '../components/MGIcon'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export default function AddressPlaceCard({ children }: { children: ReactNode }) {
  const { spacing } = useMGTheme()
  return (
    <MGCard>
      <View style={{ gap: spacing.md }}>{children}</View>
    </MGCard>
  )
}

export function AddressMapPlaceholder({ label, accessibilityLabel = 'Mapa sem ponto' }: { label: string, accessibilityLabel?: string }) {
  const { colors, radius, spacing } = useMGTheme()
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        height: 240,
        borderRadius: radius.lg,
        backgroundColor: colors.surface.canvas,
        borderWidth: 1,
        borderColor: colors.border.default,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
      }}
    >
      <MGIcon name="map-pin" size={28} color={colors.action.primary} />
      <MGText variant="body" color="secondary" style={{ textAlign: 'center' }}>{label}</MGText>
    </View>
  )
}
