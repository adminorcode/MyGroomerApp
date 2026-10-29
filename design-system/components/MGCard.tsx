import { ReactNode } from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { useMGTheme } from '../theme/useMGTheme'

export type MGCardVariant = 'default' | 'pink' | 'teal'

type Props = {
  children: ReactNode
  variant?: MGCardVariant
  padding?: number
  onPress?: () => void
  style?: ViewStyle
  accessibilityLabel?: string
}

export default function MGCard({
  children,
  variant = 'default',
  padding,
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

  const borderRadius = variant === 'default' ? radius.lg : radius.xl

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
