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
        <Pressable onPress={onBack} hitSlop={spacing.sm} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
      )}
      <View style={styles.titleContainer}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
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
    gap: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.bold,
  },
  description: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
  },
})
