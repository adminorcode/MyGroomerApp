import { View } from 'react-native'
import { APP_NAME } from '../../constants/brand'
import { useMGTheme } from '../theme/useMGTheme'
import MGArtwork from './MGArtwork'
import MGText from './MGText'

export default function MGBrand({ compact = false }: { compact?: boolean }) {
  const { colors, spacing, radius } = useMGTheme()
  const size = compact ? 48 : 64
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.base }}>
      <View style={{ width: size, height: size, borderRadius: radius.lg, backgroundColor: colors.brand.pink, alignItems: 'center', justifyContent: 'center' }}>
        <MGArtwork name="brand-symbol" width={size} />
      </View>
      <MGText variant={compact ? 'heading3' : 'logotype'} style={{ textAlign: 'center' }}>{APP_NAME}</MGText>
    </View>
  )
}
