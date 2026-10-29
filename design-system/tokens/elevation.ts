import { Platform, ViewStyle } from 'react-native'
import { palette } from './colors'

// My Groomer Design System v1.0 — seção 5.4.
// Native uses shadow* + elevation; web uses boxShadow (shadow* is deprecated there).

function shadow(opacity: number, radius: number, elevation: number, height: number): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      // RN Web accepts boxShadow; cast keeps ViewStyle happy across platforms.
      boxShadow: `0px ${height}px ${radius}px rgba(37, 61, 66, ${opacity})`,
    } as ViewStyle
  }

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
