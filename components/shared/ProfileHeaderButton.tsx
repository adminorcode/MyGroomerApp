import { Image, Pressable, StyleSheet, Text, StyleProp, ViewStyle } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { fonts } from '../../constants/theme'
import { palette } from '../../design-system/tokens'

type Props = {
    avatarUri?: string | null
    size?: number
    style?: StyleProp<ViewStyle>
    onPress: () => void
    /** Barra colorida: disco branco para a inicial rosa ou verde continuar legível. */
    onColor?: boolean
}

export default function ProfileHeaderButton({ avatarUri, size = 44, style, onPress, onColor = false }: Props) {
    const { colors } = useTheme()
    const user = useAuthStore((state) => state.user)

    const initial = user?.name?.charAt(0).toUpperCase() ?? '?'
    const dimensions = { width: size, height: size, borderRadius: size / 2 }
    const provider = user?.role === 'provider'
    const initialColor = provider ? palette.brand.teal : palette.action.primaryText
    const backgroundColor = onColor
        ? palette.surface.default
        : provider ? palette.brand.teal : colors.selectionSoft
    const textColor = onColor
        ? initialColor
        : provider ? palette.onAction.primary : colors.primaryText

    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
            style={[styles.base, dimensions, { borderColor: onColor ? palette.surface.default : colors.border }, style]}
        >
            {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={dimensions} />
            ) : (
                <Text
                    style={[
                        styles.initial,
                        {
                            color: textColor,
                            backgroundColor,
                            fontSize: Math.round(size * 0.4),
                            lineHeight: size,
                        },
                        dimensions,
                    ]}
                >
                    {initial}
                </Text>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: {
        textAlign: 'center',
        fontFamily: fonts.semibold,
    },
})
