import { ActivityIndicator, ScrollView, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGCard, MGEmptyState, MGErrorState, MGIcon, MGText } from '../../design-system/components'
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
                                <MGCard
                                    key={item.id}
                                    onPress={() => openForm(item.id)}
                                    accessibilityLabel={`${addressLabelName(item.label)}. ${item.address}${item.is_default ? '. Padrão' : ''}`}
                                    style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface.pinkSubtle, alignItems: 'center', justifyContent: 'center' }}>
                                        <MGIcon name={item.label === 'work' ? 'building-2' : 'map-pin'} color={colors.action.primary} />
                                    </View>
                                    <View style={{ flex: 1, gap: spacing.xs }}>
                                        <MGText variant="label">{addressLabelName(item.label)}</MGText>
                                        <MGText>{item.address}</MGText>
                                        {item.complement ? <MGText variant="bodySmall" color="secondary">{item.complement}</MGText> : null}
                                        {item.is_default ? <MGText variant="caption" color="info">Padrão</MGText> : null}
                                    </View>
                                    <MGIcon name="chevron-right" size={20} color={colors.text.secondary} />
                                </MGCard>
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
