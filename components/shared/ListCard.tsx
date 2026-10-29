import { Pressable, Text, View, StyleSheet, PressableProps, StyleProp, ViewStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { fonts, typography, spacing, borderRadius } from '../../constants/theme'

type Props = PressableProps & {
    title: string
    subtitle?: string
    showChevron?: boolean
}

export default function ListCard({ title, subtitle, showChevron, ...props }: Props) {
    const { colors } = useTheme()
    return (
        <Pressable
            accessibilityRole="button"
            {...props}
            style={[
                styles.card, 
                { backgroundColor: colors.surface, borderColor: colors.border}, props.style as StyleProp<ViewStyle> || {}
            ]}
        >
            <View style={styles.content}>
                <Text style={[styles.name, { color: colors.text }]}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {showChevron && (
                <ChevronRight size={20} color={colors.textSecondary} />
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: typography.sizes.lg,
        fontFamily: fonts.semibold,
    },
    desc: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.xs,
    },
})