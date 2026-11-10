import { ReactNode } from 'react'
import { Animated } from 'react-native'
import { palette, radius, spacing } from '../design-system/tokens'
import { useSelectionProgress } from '../design-system/theme/useSelectionProgress'

function transparent(hex: string) {
  const value = hex.replace('#', '')
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, 0)`
}

/**
 * CMP-07: aba ativa com pílula `surface.pinkSubtle` atrás do ícone.
 * O fundo cruza em 150 ms. O ícone não escala.
 */
export default function TabIconPill({ focused, children }: { focused: boolean; children: ReactNode }) {
  const progress = useSelectionProgress(focused)
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [transparent(palette.surface.pinkSubtle), palette.surface.pinkSubtle],
  })

  return (
    <Animated.View
      style={{
        width: 56,
        height: 32,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        marginBottom: spacing.xxs,
      }}
    >
      {children}
    </Animated.View>
  )
}
