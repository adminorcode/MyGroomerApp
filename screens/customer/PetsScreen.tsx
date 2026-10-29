import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProfileStackParamList } from '../../navigation/types'
import { usePets } from '../../hooks/usePets'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import BoameBtn from '../../components/shared/BoameBtn'
import PetCard from '../../components/customer/PetCard'
import { fonts, spacing, typography } from '../../constants/theme'

type Props = {
    navigation: StackNavigationProp<ProfileStackParamList, 'Pets'>
}

export default function PetsScreen({ navigation }: Props) {
    const { colors } = useTheme()
    const { data, isLoading, isError, refetch, isRefetching } = usePets()

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
                    <Text style={[styles.message, { color: colors.error }]}>Não foi possível carregar os pets.</Text>
                    <BoameBtn title="Tentar novamente" loading={isRefetching} onPress={() => refetch()} />
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
                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            Você ainda não cadastrou um pet.
                        </Text>
                    }
                    ListFooterComponent={
                        <View style={styles.footer}>
                            <BoameBtn title="Cadastrar pet" onPress={() => navigation.navigate('PetForm', {})} />
                        </View>
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
    message: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
    },
})
