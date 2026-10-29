import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import BoameBtn from '../shared/BoameBtn'
import PetCard from './PetCard'
import { useTheme } from '../../context/ThemeContext'
import { fonts, spacing, typography } from '../../constants/theme'
import { Pet } from '../../types/pet.types'

type Props = {
    pets?: Pet[]
    isLoading: boolean
    isError: boolean
    selectedPetId?: string
    error?: string
    onSelect: (petId: string) => void
    onCreate: () => void
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
    onRetry,
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
                    {pets.map((pet) => (
                        <PetCard
                            key={pet.id}
                            pet={pet}
                            selected={pet.id === selectedPetId}
                            onPress={() => onSelect(pet.id)}
                        />
                    ))}
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
