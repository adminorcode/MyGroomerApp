import { Pressable, StyleSheet, ViewStyle } from 'react-native'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  label: string
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  variant?: 'filter' | 'choice'
}

export default function MGChip({
  label,
  selected = false,
  disabled = false,
  onPress,
  variant = 'filter',
}: Props) {
  const { colors, spacing, radius } = useMGTheme()

  const backgroundColor = disabled
    ? colors.state.disabledSurface
    : selected
      ? colors.surface.pinkSubtle
      : colors.surface.default

  const borderColor = disabled
    ? colors.border.default
    : selected
      ? colors.action.primaryOutline
      : colors.border.default

  const textColor = disabled
    ? colors.state.disabledText
    : selected
      ? colors.action.primaryOutline
      : colors.text.primary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) =>
        [
          styles.chip,
          {
            minHeight: 36,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            backgroundColor,
            borderColor,
            opacity: pressed && !disabled ? 0.9 : 1,
          },
          variant === 'choice' && selected && { backgroundColor: colors.brand.pinkLight },
        ] as ViewStyle[]
      }
    >
      <MGText variant="label" style={{ color: textColor }}>
        {label}
      </MGText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
})
