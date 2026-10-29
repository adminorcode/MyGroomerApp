import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PawPrint } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { petSizeLabel, petSpeciesLabel, Pet } from '../../types/pet.types'

type Props = {
    pet: Pet
    selected?: boolean
    onPress?: () => void
    onEdit?: () => void
}

export default function PetCard({ pet, selected = false, onPress, onEdit }: Props) {
    const { colors } = useTheme()
    const species = petSpeciesLabel(pet.species)
    const size = petSizeLabel(pet.size)
    const photoLabel = pet.photo_url ? 'Com foto' : 'Sem foto'
    const details = `${species} · ${size} · ${photoLabel}`
    const body = (
        <>
            <View
                accessibilityLabel={photoLabel}
                style={[styles.avatar, { backgroundColor: colors.selectionSoft }]}
            >
                <PawPrint color={colors.primary} size={22} />
            </View>
            <View style={styles.content}>
                <Text style={[styles.name, { color: colors.text }]}>{pet.name}</Text>
                <Text style={[styles.details, { color: colors.textSecondary }]}>{details}</Text>
                {selected && <Text style={[styles.selected, { color: colors.primary }]}>Selecionado</Text>}
            </View>
            {onEdit && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${pet.name}`}
                    hitSlop={8}
                    onPress={onEdit}
                >
                    <Text style={[styles.edit, { color: colors.primary }]}>Editar</Text>
                </Pressable>
            )}
        </>
    )
    const cardStyle = [
        styles.card,
        {
            backgroundColor: colors.surface,
            borderColor: selected ? colors.primary : colors.border,
        },
    ]

    if (!onPress) {
        return <View style={cardStyle}>{body}</View>
    }

    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${pet.name}. ${details}${selected ? '. Selecionado' : ''}`}
            onPress={onPress}
            style={cardStyle}
        >
            {body}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 2,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
    details: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.xs,
    },
    selected: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.semibold,
        marginTop: spacing.xs,
    },
    edit: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.semibold,
    },
})
