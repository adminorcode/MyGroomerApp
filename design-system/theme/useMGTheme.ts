import { fonts, lightColors, textStyles } from '../../constants/theme'
import { elevation, palette, radius, spacing } from '../tokens'

/**
 * Semantic tokens for MG components.
 * Light-only per product decision — Design System v1.0 has no dark palette
 * and the app does not offer night mode.
 */
export function useMGTheme() {
  const colors = {
    brand: palette.brand,
    surface: palette.surface,
    text: palette.text,
    border: palette.border,
    action: {
      primary: palette.action.primary,
      primaryPressed: palette.action.primaryPressed,
      primaryOutline: palette.action.primaryOutline,
      secondary: palette.action.secondary,
      secondaryPressed: lightColors.secondaryPressed,
      focus: palette.action.focus,
    },
    feedback: {
      success: palette.feedback.success,
      successSurface: palette.feedback.successSurface,
      warning: palette.feedback.warning,
      warningSurface: palette.feedback.warningSurface,
      error: palette.feedback.error,
      errorSurface: palette.feedback.errorSurface,
      info: palette.feedback.info,
      infoSurface: palette.surface.tealSubtle,
    },
    state: {
      disabledSurface: palette.state.disabledSurface,
      disabledText: palette.state.disabledText,
      pressedSurface: lightColors.pressedSurface,
    },
    overlay: palette.overlay,
    onAction: {
      primary: palette.text.inverse,
      secondary: palette.text.inverse,
      error: palette.text.inverse,
    },
  }

  return {
    isDark: false as const,
    colors,
    spacing,
    radius,
    textStyles,
    fonts,
    elevation,
  }
}

export type MGTheme = ReturnType<typeof useMGTheme>
