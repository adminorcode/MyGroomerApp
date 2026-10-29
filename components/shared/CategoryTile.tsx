import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

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
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
           <View style={[styles.iconCircle, { backgroundColor: colors.selectionSoft }]}>
                <Text style={{ color: colors.primary, fontFamily: fonts.semibold, fontSize: typography.sizes.lg }}>
                    {name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        </Pressable>
    )
}


const styles = StyleSheet.create({
    tile: {
        width: 100,
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