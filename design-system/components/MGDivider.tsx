import { StyleSheet, View, ViewStyle } from 'react-native'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  spacing?: number
  color?: string
  style?: ViewStyle
}

export default function MGDivider({ spacing: gap, color, style }: Props) {
  const { colors, spacing } = useMGTheme()
  const vertical = gap ?? spacing.base

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: color ?? colors.border.default,
          marginVertical: vertical,
        },
        style,
      ]}
    />
  )
}
