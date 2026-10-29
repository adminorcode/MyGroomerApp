import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { fonts, typography, spacing } from '../../constants/theme'

type Props = {
  title: string
  description?: string
  showBackButton?: boolean
  onBack?: () => void
}

export default function ScreenHeader({ title, description, showBackButton, onBack }: Props) {
  const { colors } = useTheme()
  return (
    <View style={styles.container}>
      {showBackButton && (
        <Pressable onPress={onBack} hitSlop={spacing.sm} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
      )}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {description}
            </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.semibold,
  },
  description: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
  },
})
