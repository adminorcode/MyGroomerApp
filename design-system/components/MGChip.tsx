import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import MGIcon from './MGIcon'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  label: string
  accessibilityLabel?: string
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  variant?: 'filter' | 'choice'
  minHeight?: number
  appearance?: 'outline' | 'solid'
  density?: 'regular' | 'compact'
}

export default function MGChip({
  label,
  accessibilityLabel,
  selected = false,
  disabled = false,
  onPress,
  minHeight = 36,
  appearance = 'outline',
  density = 'regular',
}: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const solid = appearance === 'solid'

  const backgroundColor = disabled
    ? colors.state.disabledSurface
    : solid && selected
      ? colors.action.primary
      : selected
        ? colors.surface.pinkSubtle
        : colors.surface.default

  const borderColor = disabled
    ? colors.border.default
    : solid && selected
      ? colors.action.primary
      : selected
        ? colors.action.primaryOutline
        : colors.border.default

  const textColor = disabled
    ? colors.state.disabledText
    : solid && selected
      ? colors.onAction.primary
      : selected
        ? colors.action.primaryOutline
        : colors.text.primary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) =>
        [
          styles.chip,
          {
            minHeight,
            paddingHorizontal: density === 'compact' ? spacing.xs : spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            backgroundColor,
            borderColor,
            width: density === 'compact' ? '100%' : undefined,
            opacity: pressed && !disabled ? 0.9 : 1,
          },
        ] as ViewStyle[]
      }
    >
      <View style={[styles.labelRow, { gap: spacing.xs }]}>
        {solid && selected ? <MGIcon name="check" size={14} color={textColor} /> : null}
        <MGText variant="label" style={{ color: textColor }} numberOfLines={1}>
          {label}
        </MGText>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
