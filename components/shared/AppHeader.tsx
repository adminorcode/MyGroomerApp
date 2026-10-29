import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Bell } from 'lucide-react-native'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { fonts, layout, spacing, typography } from '../../constants/theme'
import ProfileHeaderButton from './ProfileHeaderButton'

const AVATAR_SIZE = 32

type Props = {
    onProfilePress: () => void
}

export default function AppHeader({ onProfilePress }: Props) {
    const { colors } = useTheme()
    const user = useAuthStore((state) => state.user)
    const firstName = user?.name?.split(' ')[0]

    return (
        <View style={[styles.container, { borderBottomColor: colors.border }]}>
            <View style={styles.left}>
                <ProfileHeaderButton size={AVATAR_SIZE} onPress={onProfilePress} />
                <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>
                    {firstName ? `Olá, ${firstName}` : 'Olá'}
                </Text>
            </View>

            <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Notificações"
                onPress={() => {}}
                style={styles.bellButton}
            >
                <Bell color={colors.text} size={22} />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.screenPadding,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    left: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginRight: spacing.md,
    },
    greeting: {
        flexShrink: 1,
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
    bellButton: {
        padding: spacing.xs,
    },
})
