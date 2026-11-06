import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { ChevronRight } from 'lucide-react-native'
import { MGButton, MGEmptyState, MGErrorState, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { useCustomerAddresses } from '../../hooks/useCustomerAddresses'
import { ProfileStackParamList } from '../../navigation/types'
import { addressLabelName } from '../../services/customerAddress.service'

type Props = {
    navigation: StackNavigationProp<ProfileStackParamList, 'Addresses'>
}

export default function AddressesScreen({ navigation }: Props) {
    const { colors, radius, spacing } = useMGTheme()
    const addresses = useCustomerAddresses()
    const openForm = (addressId?: string) => navigation.navigate('AddressForm', { addressId })

    return (
        <ScreenContainer>
            <ScreenHeader
                title="Endereços"
                description="Casa, trabalho e outros locais de atendimento"
                showBackButton
                onBack={() => navigation.goBack()}
            />
            {addresses.isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                    <ActivityIndicator accessibilityLabel="Carregando endereços" size="large" color={colors.action.primary} />
                    <MGText>Carregando endereços</MGText>
                </View>
            ) : addresses.isError ? (
                <MGErrorState
                    message="Não foi possível carregar os endereços."
                    onRetry={() => { void addresses.refetch() }}
                />
            ) : (
                <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
                    {addresses.data && addresses.data.length > 0 ? (
                        <>
                            {addresses.data.map(item => (
                                <Pressable
                                    key={item.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${addressLabelName(item.label)}. ${item.address}${item.is_default ? '. Padrão' : ''}`}
                                    onPress={() => openForm(item.id)}
                                    style={({ pressed }) => ({
                                        minHeight: 72,
                                        padding: spacing.md,
                                        borderRadius: radius.lg,
                                        borderWidth: 1,
                                        borderColor: colors.border.default,
                                        backgroundColor: pressed ? colors.state.pressedSurface : colors.surface.default,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: spacing.sm,
                                    })}
                                >
                                    <View style={{ flex: 1, gap: spacing.xs }}>
                                        <MGText variant="label">{addressLabelName(item.label)}</MGText>
                                        <MGText>{item.address}</MGText>
                                        {item.complement ? <MGText variant="bodySmall" color="secondary">{item.complement}</MGText> : null}
                                        {item.is_default ? <MGText variant="caption" color="info">Padrão</MGText> : null}
                                    </View>
                                    <ChevronRight size={20} color={colors.text.secondary} />
                                </Pressable>
                            ))}
                            <MGButton label="Cadastrar endereço" onPress={() => openForm()} />
                        </>
                    ) : (
                        <MGEmptyState
                            title="Nenhum endereço salvo"
                            description="Você ainda não tem um local salvo."
                            actionLabel="Cadastrar endereço"
                            onAction={() => openForm()}
                        />
                    )}
                </ScrollView>
            )}
        </ScreenContainer>
    )
}
