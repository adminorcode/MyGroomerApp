import { Image, Pressable, StyleSheet, Text, StyleProp, ViewStyle } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { fonts } from '../../constants/theme'

type Props = {
    avatarUri?: string | null
    size?: number
    style?: StyleProp<ViewStyle>
    onPress: () => void
}

export default function ProfileHeaderButton({ avatarUri, size = 44, style, onPress }: Props) {
    const { colors } = useTheme()
    const user = useAuthStore((state) => state.user)

    const initial = user?.name?.charAt(0).toUpperCase() ?? '?'
    const dimensions = { width: size, height: size, borderRadius: size / 2 }

    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={[styles.base, dimensions, { borderColor: colors.border }, style]}
        >
            {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={dimensions} />
            ) : (
                <Text
                    style={[
                        styles.initial,
                        {
                            color: colors.primary,
                            backgroundColor: colors.selectionSoft,
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
