import { AppAlert } from '../../utils/alert'
import { View, Text, ActivityIndicator, FlatList, StyleSheet, Pressable, Alert } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Plus, Pencil, Trash2 } from 'lucide-react-native'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { useTheme } from '../../context/ThemeContext'
import { useGetProviderServices, useDeleteProviderService } from '../../hooks/useProviders'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
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

            {deleteError && <Text accessibilityRole="alert" style={{ color: colors.error }}>{getErrorMessage(deleteError)}</Text>}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size='large' color={colors.primary} />
                </View>
            ) : isError ? (
                <View style={styles.centered}>
                    <Text style={[styles.message, { color: colors.error }]}>
                        Não foi possível carregar os serviços.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={services}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.cardContent}>
                                <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                                    {item.service_name}
                                </Text>
                                <Text style={[styles.price, { color: colors.primary }]}>{formatMoney(item.price)}</Text>
                            </View>
                            <View style={styles.actions}>
                                <Pressable
                                    onPress={() => navigation.navigate('EditService', {
                                        providerServiceId: item.id,
                                        serviceName: item.service_name,
                                        price: item.price,
                                    })}
                                    style={styles.iconButton}
                                    accessibilityRole='button'
                                    accessibilityLabel='Editar preço'
                                >
                                    <Pencil size={18} color={colors.textSecondary} />
                                </Pressable>
                                <Pressable
                                    onPress={() => handleDelete(item)}
                                    disabled={isDeleting}
                                    style={styles.iconButton}
                                    accessibilityRole='button'
                                    accessibilityLabel='Remover serviço'
                                >
                                    <Trash2 size={18} color={colors.error} />
                                </Pressable>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={[styles.message, { color: colors.textSecondary }]}>
                                Você ainda não adicionou serviços. Toque em + para incluir um.
                            </Text>
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
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    cardContent: {
        flex: 1,
        gap: spacing.xs,
    },
    serviceName: {
        fontSize: typography.sizes.lg,
        fontFamily: fonts.semibold,
    },
    price: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    iconButton: {
        padding: spacing.sm,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    message: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
        textAlign: 'center',
    },
})

