import { View } from 'react-native'
import { MGText } from '../../design-system/components'
import MGArtwork from '../../design-system/components/MGArtwork'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

/** G03–G05 share the same compact introduction and supplied AS-04 artwork. */
export default function ProviderSetupIntro({ title, description }: { title: string; description: string }) {
  const { spacing } = useMGTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
        <MGText variant="heading2" accessibilityRole="header">{title}</MGText>
        <MGText variant="bodySmall" color="secondary">{description}</MGText>
      </View>
      <MGArtwork name="professional" width={80} height={88} />
    </View>
  )
}
