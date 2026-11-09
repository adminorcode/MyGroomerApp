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
  density?: 'regular' | 'compact'
}

/**
 * CMP-06 / R1: a ação é sempre rosa. Selecionado = preenchimento `action.primary`
 * com texto `onAction.primary` e check. Não selecionado = contorno `action.primaryOutline`.
 */
export default function MGChip({
  label,
  accessibilityLabel,
  selected = false,
  disabled = false,
  onPress,
  minHeight = 36,
  density = 'regular',
}: Props) {
  const { colors, spacing, radius } = useMGTheme()

  const backgroundColor = disabled
    ? colors.state.disabledSurface
    : selected
      ? colors.action.primary
      : colors.surface.default

  const borderColor = disabled
    ? colors.border.default
    : selected
      ? colors.action.primary
      : colors.action.primaryOutline

  const textColor = disabled
    ? colors.state.disabledText
    : selected
      ? colors.onAction.primary
      : colors.text.primary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) =>
        [
          styles.chip,
          {
            minHeight,
            // Chip compacto com check: folga mínima de 8 pt para o rótulo não encostar na borda.
            paddingHorizontal: density === 'compact' ? spacing.sm : spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            backgroundColor: pressed && !disabled
              ? selected ? colors.action.primaryPressed : colors.surface.pinkSubtle
              : backgroundColor,
            borderColor: pressed && !disabled && selected ? colors.action.primaryPressed : borderColor,
            width: density === 'compact' ? '100%' : undefined,
          },
        ] as ViewStyle[]
      }
    >
      <View style={[styles.labelRow, { gap: spacing.xs }]}>
        {selected && !disabled ? <MGIcon name="check" size={14} color={textColor} /> : null}
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
