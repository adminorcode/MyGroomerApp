export const layout = {
    screenPadding: 20
}

// Pink & Teal. Brand #D95786 is the signature and is only used for large type.
// Small text and controls use the roles below. Pairs were checked at 4.5:1 for
// text and 3:1 for essential control boundaries, on the opaque colors.
export const lightColors = {
    brand: '#D95786',
    primary: '#B93666',
    onPrimary: '#FFFFFF',
    primaryPressed: '#9E2B56',
    primaryLight: '#F6B5CB',
    primaryDark: '#9E2B56',
    secondary: '#167D83',
    onSecondary: '#FFFFFF',
    secondaryPressed: '#0B5559',
    onSecondaryPressed: '#FFFFFF',
    selection: '#F6B5CB',
    onSelection: '#253D42',
    selectionSoft: '#FBE4ED',
    background: '#F9F8F6',
    surface: '#FFFFFF',
    pressedSurface: '#EFEBE6',
    text: '#253D42',
    textSecondary: '#4A6266',
    navInactive: '#253D42',
    border: '#8E8882',
    focus: '#167D83',
    error: '#B42318',
    onError: '#FFFFFF',
    errorPressed: '#8E1C14',
    errorSoft: '#F8D7D4',
    success: '#146C43',
    successSoft: '#D8F0E4',
    warning: '#8A5A00',
    warningSoft: '#F8E8C8',
    info: '#0F5C61',
    infoSoft: '#D4EEF0',
    disabled: '#E4DDD6',
    onDisabled: '#5C534E',
    disabledBorder: '#8E8882',
}

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

export type AppColors = typeof lightColors

export const fonts = {
    logo: 'Abres',
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
}

export const typography = {
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 32,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    }
}

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
}

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
}