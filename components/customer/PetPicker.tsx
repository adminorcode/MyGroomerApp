import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import BoameBtn from '../shared/BoameBtn'
import PetCard from './PetCard'
import { useTheme } from '../../context/ThemeContext'
import { fonts, spacing, typography } from '../../constants/theme'
import { Pet } from '../../types/pet.types'
import { petUseBlock } from '../../utils/petReadiness'

type Props = {
    pets?: Pet[]
    isLoading: boolean
    isError: boolean
    selectedPetId?: string
    error?: string
    onSelect: (petId: string) => void
    onCreate: () => void
    onEdit?: (petId: string) => void
    photoRequired?: boolean
    onRetry: () => void
}

export default function PetPicker({
    pets,
    isLoading,
    isError,
    selectedPetId,
    error,
    onSelect,
    onCreate,
    onEdit,
    onRetry,
    photoRequired = false,
}: Props) {
    const { colors } = useTheme()

    return (
        <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Pet</Text>
            {isLoading ? (
                <ActivityIndicator accessibilityLabel="Carregando pets" color={colors.primary} />
            ) : isError ? (
                <View style={styles.stack}>
                    <Text style={[styles.message, { color: colors.error }]}>Não foi possível carregar os pets.</Text>
                    <BoameBtn title="Tentar novamente" onPress={onRetry} />
                </View>
            ) : !pets?.length ? (
                <View style={styles.stack}>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>Você ainda não cadastrou um pet.</Text>
                    <BoameBtn title="Cadastrar pet" onPress={onCreate} />
                </View>
            ) : (
                <View>
                    {pets.map((pet) => {
                        const block = petUseBlock(pet, photoRequired)
                        return (
                            <View key={pet.id}>
                                <PetCard
                                    pet={pet}
                                    selected={pet.id === selectedPetId && !block}
                                    onPress={() => block ? onEdit?.(pet.id) : onSelect(pet.id)}
                                />
                                {block ? (
                                    <Text style={[styles.error, { color: colors.error }]}>{block}</Text>
                                ) : null}
                            </View>
                        )
                    })}
                    <BoameBtn title="Cadastrar outro pet" variant="outline" onPress={onCreate} />
                </View>
            )}
            {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    section: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
        marginBottom: spacing.sm,
    },
    stack: {
        gap: spacing.md,
    },
    message: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
    },
    error: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.sm,
    },
})
