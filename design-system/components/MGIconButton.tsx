import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native'
import { ReactNode } from 'react'
import { useMGTheme } from '../theme/useMGTheme'

type Props = Omit<PressableProps, 'children'> & {
  icon: ReactNode
  accessibilityLabel: string
}

export default function MGIconButton({
  icon,
  accessibilityLabel,
  disabled = false,
  style,
  ...props
}: Props) {
  const { colors, radius, spacing } = useMGTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          minWidth: 44,
          minHeight: 44,
          borderRadius: radius.md,
          padding: spacing.sm,
          backgroundColor: pressed && !disabled ? colors.state.pressedSurface : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style as ViewStyle,
      ]}
      {...props}
    >
      {icon}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
