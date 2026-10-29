import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProfileStackParamList } from '../../navigation/types'
import { usePets } from '../../hooks/usePets'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGEmptyState, MGErrorState } from '../../design-system/components'
import PetCard from '../../components/customer/PetCard'
import { spacing } from '../../constants/theme'

type Props = {
    navigation: StackNavigationProp<ProfileStackParamList, 'Pets'>
}

export default function PetsScreen({ navigation }: Props) {
    const { colors } = useTheme()
    const { data, isLoading, isError, refetch } = usePets()

    return (
        <ScreenContainer>
            <ScreenHeader
                title="Meus pets"
                description="Cadastre os pets para reutilizar nos agendamentos"
                showBackButton
                onBack={() => navigation.goBack()}
            />
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator accessibilityLabel="Carregando pets" size="large" color={colors.primary} />
                </View>
            ) : isError ? (
                <View style={styles.centered}>
                    <MGErrorState
                        message="Não foi possível carregar os pets."
                        onRetry={() => { void refetch() }}
                    />
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <PetCard
                            pet={item}
                            onEdit={() => navigation.navigate('PetForm', { petId: item.id })}
                        />
                    )}
                    ListEmptyComponent={
                        <MGEmptyState
                            title="Nenhum pet cadastrado"
                            description="Você ainda não cadastrou um pet."
                            actionLabel="Cadastrar pet"
                            onAction={() => navigation.navigate('PetForm', {})}
                        />
                    }
                    ListFooterComponent={
                        data && data.length > 0 ? (
                            <View style={styles.footer}>
                                <MGButton label="Cadastrar pet" onPress={() => navigation.navigate('PetForm', {})} />
                            </View>
                        ) : null
                    }
                />
            )}
        </ScreenContainer>
    )
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        gap: spacing.md,
    },
    list: {
        flexGrow: 1,
        paddingBottom: spacing.xl,
    },
    footer: {
        marginTop: spacing.md,
    },
})
