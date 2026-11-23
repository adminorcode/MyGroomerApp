import { Pressable, StyleSheet, View } from 'react-native'
import { ChevronLeft, Phone, Video as VideoIcon } from 'lucide-react-native'
import { spacing } from '../../constants/theme'
import { MGAvatar, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

type Props = {
    name: string
    avatarUri?: string | null
    status?: string
    onBack?: () => void
    onCall?: () => void
    onVideoCall?: () => void
}

/** R8: avatar do interlocutor é teal quando é profissional, rosa quando é tutor. */
export default function ChatHeader({ name, avatarUri, status, onBack, onCall, onVideoCall, avatarTone = 'pink' }: Props & { avatarTone?: 'pink' | 'teal' }) {
    const { colors, radius } = useMGTheme()

    return (
        <View style={[styles.container, { borderColor: colors.border.default, backgroundColor: colors.surface.default, borderRadius: radius.lg }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} hitSlop={spacing.sm} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <ChevronLeft size={26} color={colors.text.primary} />
            </Pressable>

            <MGAvatar name={name} uri={avatarUri} size={40} tone={avatarTone} />

            <View style={styles.info}>
                <MGText variant="title" numberOfLines={1}>{name}</MGText>
                {!!status && (
                    <MGText variant="caption" color="secondary" numberOfLines={1}>{status}</MGText>
                )}
            </View>

            <View style={styles.actions}>
                {onVideoCall ? <Pressable accessibilityRole="button" accessibilityLabel="Chamada de vídeo" onPress={onVideoCall} hitSlop={spacing.sm}>
                    <VideoIcon size={22} color={colors.action.primary} />
                </Pressable> : null}
                {onCall ? <Pressable accessibilityRole="button" accessibilityLabel="Ligar" onPress={onCall} hitSlop={spacing.sm}>
                    <Phone size={20} color={colors.action.primary} />
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
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    backBtn: {
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
})
