import { ReactNode } from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { useMGTheme } from '../theme/useMGTheme'

export type MGTextVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'title'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'button'
  | 'numeric'

export type MGTextColor = 'primary' | 'secondary' | 'inverse' | 'brand' | 'error' | 'success' | 'warning' | 'info'

type Props = Omit<TextProps, 'children'> & {
  children: ReactNode
  variant?: MGTextVariant
  color?: MGTextColor
}

export default function MGText({
  children,
  variant = 'body',
  color = 'primary',
  style,
  ...props
}: Props) {
  const { colors, textStyles, fonts } = useMGTheme()
  const type = textStyles[variant]

  const colorMap: Record<MGTextColor, string> = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    inverse: colors.text.inverse,
    brand: colors.action.primary,
    error: colors.feedback.error,
    success: colors.feedback.success,
    warning: colors.feedback.warning,
    info: colors.feedback.info,
  }

  const family =
    type.fontWeight === '700' || type.fontWeight === '600'
      ? fonts.semibold
      : fonts.regular

  return (
    <Text
      {...props}
      style={[
        styles.base,
        {
          fontSize: type.fontSize,
          lineHeight: type.lineHeight,
          fontFamily: family,
          color: colorMap[color],
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {},
})
