import { palette, radius, spacing, textStyles } from '../design-system/tokens'

export { palette, radius, spacing, textStyles }
export { elevation } from '../design-system/tokens'

// Flat names kept for the screens that already call useTheme().colors.
// Light values come from Design System v1.0. Pressed teal, pressed surface
// and pressed error are adapters: v1.0 does not name those three roles.
export const lightColors = {
    brand: palette.brand.pink,
    primary: palette.action.primary,
    onPrimary: palette.text.inverse,
    primaryPressed: palette.action.primaryPressed,
    primaryLight: palette.brand.pinkLight,
    primaryDark: palette.action.primaryPressed,
    secondary: palette.action.secondary,
    onSecondary: palette.text.inverse,
    secondaryPressed: '#0B5559',
    onSecondaryPressed: palette.text.inverse,
    selection: palette.brand.pinkLight,
    onSelection: palette.text.primary,
    selectionSoft: palette.surface.pinkSubtle,
    background: palette.surface.canvas,
    surface: palette.surface.default,
    pressedSurface: '#EFEBE6',
    text: palette.text.primary,
    textSecondary: palette.text.secondary,
    navInactive: palette.text.primary,
    border: palette.border.default,
    focus: palette.action.focus,
    error: palette.feedback.error,
    onError: palette.text.inverse,
    errorPressed: '#8E1C14',
    errorSoft: palette.feedback.errorSurface,
    success: palette.feedback.success,
    successSoft: palette.feedback.successSurface,
    warning: palette.feedback.warning,
    warningSoft: palette.feedback.warningSurface,
    info: palette.feedback.info,
    infoSoft: palette.surface.tealSubtle,
    disabled: palette.state.disabledSurface,
    onDisabled: palette.state.disabledText,
    disabledBorder: palette.border.strong,
}

// Kept for reference only. The app is light-only and ignores OS night mode.
/** @deprecated Unused — ThemeProvider always serves lightColors. */
export const darkColors = {
    brand: '#D95786',
    primary: '#F6B5CB',
    onPrimary: '#253D42',
    primaryPressed: '#E59BB8',
    primaryLight: '#F6B5CB',
    primaryDark: '#E59BB8',
    secondary: '#167D83',
    onSecondary: '#FFFFFF',
    secondaryPressed: '#5EC8CC',
    onSecondaryPressed: '#253D42',
    selection: '#F6B5CB',
    onSelection: '#253D42',
    selectionSoft: '#3A2430',
    background: '#121C1F',
    surface: '#1C2C30',
    pressedSurface: '#24383C',
    text: '#F7F5F2',
    textSecondary: '#A8B8BB',
    navInactive: '#A8B8BB',
    border: '#6A868C',
    focus: '#8FE0E3',
    error: '#FF8B8B',
    onError: '#121C1F',
    errorPressed: '#F07070',
    errorSoft: '#3A2424',
    success: '#7ED9B5',
    successSoft: '#163028',
    warning: '#F6C453',
    warningSoft: '#3A3018',
    info: '#8FE0E3',
    infoSoft: '#163033',
    disabled: '#2C3A3E',
    onDisabled: '#C5D0D2',
    disabledBorder: '#6A868C',
}

export type AppColors = { [Key in keyof typeof lightColors]: string }

export const fonts = {
    logo: 'Abres',
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
}

export const typography = {
    sizes: {
        xs: textStyles.caption.fontSize,
        sm: textStyles.bodySmall.fontSize,
        md: textStyles.body.fontSize,
        lg: textStyles.heading3.fontSize,
        xl: textStyles.numeric.fontSize,
        xxl: textStyles.display.fontSize,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
}

export const borderRadius = {
    ...radius,
    full: radius.pill,
}

export const layout = {
    screenPadding: spacing.base,
    screenPaddingOnboarding: spacing.lg,
}
