import { AppAlert } from '../../utils/alert'
import { View, ActivityIndicator, FlatList, StyleSheet, Pressable } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Plus } from 'lucide-react-native'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { useTheme } from '../../context/ThemeContext'
import { useGetProviderServices, useDeleteProviderService } from '../../hooks/useProviders'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGEmptyState, MGErrorState, MGText } from '../../design-system/components'
import { ServiceEditorCard } from '../../design-system/patterns'
import { borderRadius, spacing } from '../../constants/theme'
import { ProviderServiceDetailed } from '../../types/provider.types'
import { getErrorMessage } from '../../utils/error'
import { formatMoney } from '../../utils/formatMoney'

type MyServicesNavigationProp = StackNavigationProp<ProviderServicesStackParamList, 'MyServices'>

type Props = {
    navigation: MyServicesNavigationProp
}

export default function MyServices({ navigation }: Props) {
    const { colors } = useTheme()
    const { data: services, isLoading, isError } = useGetProviderServices()
    const { mutate: deleteService, isPending: isDeleting, error: deleteError } = useDeleteProviderService()

    const handleDelete = (item: ProviderServiceDetailed) => {
        AppAlert.alert(
            'Remover serviço?',
            `"${item.service_name}" deixará de aparecer para os tutores agendarem.`,
            [
                { text: 'Manter', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => deleteService(item.id) },
            ]
        )
    }

    return (
        <ScreenContainer>
            <View style={styles.headerRow}>
                <View style={styles.headerText}>
                    <ScreenHeader
                        title='Meus serviços'
                        description='Gerencie os serviços e os preços que você oferece'
                    />
                </View>
                <Pressable
                    onPress={() => navigation.navigate('AddService')}
                    style={({ pressed }) => [
                        styles.addButton,
                        { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
                    ]}
                    accessibilityRole='button'
                    accessibilityLabel='Adicionar serviço'
                >
                    <Plus size={22} color={colors.onPrimary} />
                </Pressable>
            </View>

            {deleteError ? (
                <MGText variant="bodySmall" color="error" accessibilityRole="alert">
                    {getErrorMessage(deleteError)}
                </MGText>
            ) : null}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size='large' color={colors.primary} />
                </View>
            ) : isError ? (
                <View style={styles.centered}>
                    <MGErrorState message="Não foi possível carregar os serviços." />
                </View>
            ) : (
                <FlatList
                    data={services}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.cardWrap}>
                            <ServiceEditorCard
                                name={item.service_name}
                                prices={{ medium: formatMoney(item.price) }}
                                onEdit={() => navigation.navigate('EditService', {
                                    providerServiceId: item.id,
                                    serviceName: item.service_name,
                                    price: item.price,
                                })}
                            />
                            <MGButton
                                label="Remover"
                                variant="destructive"
                                onPress={() => handleDelete(item)}
                                disabled={isDeleting}
                                loading={isDeleting}
                            />
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <MGEmptyState
                                title="Nenhum serviço"
                                description="Você ainda não adicionou serviços. Toque em + para incluir um."
                            />
                        </View>
                    }
                    keyExtractor={(item) => item.id}
                />
            )}
        </ScreenContainer>
    )
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    headerText: {
        flex: 1,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: spacing.xl,
        gap: spacing.md,
    },
    cardWrap: {
        gap: spacing.sm,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
})
