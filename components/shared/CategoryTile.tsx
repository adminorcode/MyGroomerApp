import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { MGIcon } from '../../design-system/components'

type Props = {
    name: string
    onPress: () => void
}

export default function CategoryTile({ name, onPress }: Props) {
    const { colors } = useTheme()
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={name}
            onPress={onPress}
            style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.selectionSoft : colors.surface, borderColor: colors.border }]}
        >
           <View style={[styles.iconCircle, { backgroundColor: colors.selectionSoft }]}>
                <MGIcon name={/banho/i.test(name) ? 'bath' : /tosa/i.test(name) ? 'scissors' : 'paw-print'} color={colors.primary} size={24} />
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        </Pressable>
    )
}


const styles = StyleSheet.create({
    tile: {
        width: 132,
        minHeight: 112,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    name: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.medium,
        textAlign: 'center',
    },
})
