import { ReactNode } from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { useMGTheme } from '../theme/useMGTheme'

export type MGCardVariant = 'default' | 'pink' | 'teal'

type Props = {
  children: ReactNode
  variant?: MGCardVariant
  padding?: number
  /** `card` = 16 pt; `hero` = 20 pt (destaque). Sem prop, segue a tonalidade (default 16, pink/teal 20). */
  shape?: 'card' | 'hero'
  onPress?: () => void
  style?: ViewStyle
  accessibilityLabel?: string
}

export default function MGCard({
  children,
  variant = 'default',
  padding,
  shape,
  onPress,
  style,
  accessibilityLabel,
}: Props) {
  const { colors, spacing, radius, elevation } = useMGTheme()
  const pad = padding ?? spacing.base

  const backgroundColor =
    variant === 'pink'
      ? colors.surface.pinkSubtle
      : variant === 'teal'
        ? colors.surface.tealSubtle
        : colors.surface.default

  const borderRadius = shape
    ? shape === 'hero'
      ? radius.xl
      : radius.lg
    : variant === 'default'
      ? radius.lg
      : radius.xl

  const content = (
    <View
      style={[
        styles.card,
        elevation.low,
        {
          backgroundColor,
          borderRadius,
          padding: pad,
          borderWidth: variant === 'default' ? 1 : 0,
          borderColor: colors.border.default,
        },
        style,
      ]}
    >
      {children}
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {},
})
