import { Pressable, StyleSheet } from 'react-native'
import { MGIcon, MGIconName, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

type Props = {
    name: string
    onPress: () => void
    selected?: boolean
    size?: 'home' | 'compact'
    icon?: MGIconName
}

function iconFor(name: string): MGIconName {
    if (/banho/i.test(name)) return 'bath'
    if (/tosa/i.test(name)) return 'scissors'
    if (/todos/i.test(name)) return 'grid'
    return 'paw-print'
}

export default function CategoryTile({ name, onPress, selected = false, size = 'home', icon }: Props) {
    const { colors, radius, spacing } = useMGTheme()
    const compact = size === 'compact'
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={selected ? `${name}, selecionado` : name}
            accessibilityState={{ selected }}
            onPress={onPress}
            style={({ pressed }) => [
                compact ? styles.compact : styles.home,
                {
                    borderRadius: compact ? radius.control : radius.lg,
                    backgroundColor: pressed ? colors.surface.canvas : colors.surface.default,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.action.primary : colors.border.default,
                    gap: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: compact ? spacing.sm : spacing.md,
                },
            ]}
        >
            <MGIcon name={icon ?? iconFor(name)} size={compact ? 26 : 24} color={selected ? colors.action.primary : colors.text.primary} />
            <MGText variant="bodySmall" numberOfLines={2} style={{ color: colors.text.primary, textAlign: 'center' }}>{name}</MGText>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    home: {
        width: 132,
        minHeight: 112,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compact: {
        width: 76,
        minHeight: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
