import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronLeft, Phone, Video } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { fonts, spacing, typography } from '../../constants/theme'

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
        <View style={[styles.container, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onBack} hitSlop={spacing.sm} style={styles.backBtn}>
                <ChevronLeft size={26} color={colors.text} />
            </Pressable>

            {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.selectionSoft }]}>
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {name.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}

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
                <Pressable onPress={onVideoCall} hitSlop={spacing.sm}>
                    <Video size={22} color={colors.primary} />
                </Pressable>
                <Pressable onPress={onCall} hitSlop={spacing.sm}>
                    <Phone size={20} color={colors.primary} />
                </Pressable>
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
        borderBottomWidth: 1,
    },
    backBtn: {
        marginRight: -spacing.xs,
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
