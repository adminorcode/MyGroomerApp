import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

type Props = {
    label: string
}

export default function ChatDateSeparator({ label }: Props) {
    const { colors } = useTheme()
    return (
        <View style={styles.container}>
            <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </View>
    )
}

export function formatDateLabel(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)

    if (dayDiff === 0) return 'Hoje'
    if (dayDiff === 1) return 'Ontem'
    if (dayDiff < 7) return date.toLocaleDateString('pt-BR', { weekday: 'long' })
    return date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: spacing.sm,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    label: {
        fontSize: typography.sizes.xs,
        fontFamily: fonts.medium,
    },
})
