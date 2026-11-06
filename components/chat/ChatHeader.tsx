import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronLeft, Phone, Video } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { fonts, spacing, typography } from '../../constants/theme'
import { MGAvatar } from '../../design-system/components'

type Props = {
    name: string
    avatarUri?: string | null
    status?: string
    onBack?: () => void
    onCall?: () => void
    onVideoCall?: () => void
}

export default function ChatHeader({ name, avatarUri, status, onBack, onCall, onVideoCall }: Props) {
    const { colors } = useTheme()

    return (
        <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} hitSlop={spacing.sm} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <ChevronLeft size={26} color={colors.text} />
            </Pressable>

            <MGAvatar name={name} uri={avatarUri} size={40} />

            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {name}
                </Text>
                {!!status && (
                    <Text style={[styles.status, { color: colors.textSecondary }]} numberOfLines={1}>
                        {status}
                    </Text>
                )}
            </View>

            <View style={styles.actions}>
                {onVideoCall ? <Pressable accessibilityRole="button" accessibilityLabel="Chamada de vídeo" onPress={onVideoCall} hitSlop={spacing.sm}>
                    <Video size={22} color={colors.primary} />
                </Pressable> : null}
                {onCall ? <Pressable accessibilityRole="button" accessibilityLabel="Ligar" onPress={onCall} hitSlop={spacing.sm}>
                    <Phone size={20} color={colors.primary} />
                </Pressable> : null}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        borderWidth: 1,
        borderRadius: spacing.base,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    backBtn: {
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 9999,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
    status: {
        fontSize: typography.sizes.xs,
        fontFamily: fonts.regular,
        marginTop: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
})
