import { ViewStyle } from 'react-native'
import { palette } from './colors'

// My Groomer Design System v1.0 — seção 5.4.
// O guia nomeia os níveis e não fixa opacidade. Estes valores são o mapa React Native.

function shadow(opacity: number, radius: number, elevation: number, height: number): ViewStyle {
  return {
    shadowColor: palette.brand.ink,
    shadowOpacity: opacity,
    shadowOffset: { width: 0, height },
    shadowRadius: radius,
    elevation,
  }
}

export const elevation = {
  none: shadow(0, 0, 0, 0),
  low: shadow(0.08, 6, 2, 2),
  medium: shadow(0.12, 12, 4, 4),
  overlay: shadow(0.2, 24, 8, 8),
} as const
