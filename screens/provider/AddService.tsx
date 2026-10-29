import { AppAlert } from '../../utils/alert'
import { useMemo, useState } from 'react'
import {
    View,
    Text,
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Pressable,
    TextInput,
    Alert,
    KeyboardAvoidingView,
} from 'react-native'
import { Check } from 'lucide-react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { useTheme } from '../../context/ThemeContext'
import { useGetAllServices } from '../../hooks/useServices'
import { useCreateProviderService, useGetProviderServices } from '../../hooks/useProviders'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import BoameBtn from '../../components/shared/BoameBtn'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { Service } from '../../types/service.types'

type AddServiceNavigationProp = StackNavigationProp<ProviderServicesStackParamList, 'AddService'>

type Props = {
    navigation: AddServiceNavigationProp
}

export default function AddService({ navigation }: Props) {
    const { colors } = useTheme()
    const { data: allServices, isLoading, isError } = useGetAllServices(undefined, 1, 100)
    const { data: myServices } = useGetProviderServices()
    const { mutateAsync: createProviderService, isPending } = useCreateProviderService()

    const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined)
    const [price, setPrice] = useState('')

    // hide services the provider already offers
    const availableServices = useMemo<Service[]>(() => {
        if (!allServices) return []
        const ownedIds = new Set((myServices ?? []).map((s) => s.service_id))
        return (allServices as Service[]).filter((s) => s.id && !ownedIds.has(s.id))
    }, [allServices, myServices])

    const handleAdd = async () => {
        if (!selectedServiceId) {
            AppAlert.alert('Selecione um serviço', 'Escolha um serviço para oferecer.')
            return
        }
        const parsedPrice = Number(price)
        if (!price.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
            AppAlert.alert('Preço inválido', 'Informe um preço maior que zero.')
            return
        }

        try {
            await createProviderService({ serviceId: selectedServiceId, price: parsedPrice })
            navigation.goBack()
        } catch (error) {
            AppAlert.alert('Não foi possível adicionar o serviço', 'Algo deu errado. Tente novamente.')
        }
    }

    return (
        <ScreenContainer>
            <ScreenHeader
                title='Adicionar serviço'
                description='Escolha um serviço e defina o preço'
                showBackButton
                onBack={() => navigation.goBack()}
            />

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
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior='padding'
                >
                    <FlatList
                        data={availableServices}
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const isSelected = selectedServiceId === item.id
                            return (
                                <Pressable
                                    onPress={() => setSelectedServiceId(item.id)}
                                    style={[
                                        styles.serviceRow,
                                        {
                                            backgroundColor: isSelected ? colors.selectionSoft : colors.surface,
                                            borderColor: isSelected ? colors.selection : colors.border,
                                        },
                                    ]}
                                >
                                    <View style={styles.serviceInfo}>
                                        <Text style={[styles.serviceName, { color: colors.text }]}>{item.name}</Text>
                                        {item.description && (
                                            <Text
                                                style={[styles.serviceDesc, { color: colors.textSecondary }]}
                                                numberOfLines={1}
                                            >
                                                {item.description}
                                            </Text>
                                        )}
                                    </View>
                                    {isSelected && <Check size={20} color={colors.primary} />}
                                </Pressable>
                            )
                        }}
                        ListEmptyComponent={
                            <View style={styles.centered}>
                                <Text style={[styles.message, { color: colors.textSecondary }]}>
                                    Você já oferece todos os serviços disponíveis.
                                </Text>
                            </View>
                        }
                        keyExtractor={(item) => item.id ?? item.name}
                    />

                    <View style={styles.footer}>
                        <Text style={[styles.label, { color: colors.text }]}>Preço (R$)</Text>
                        <TextInput
                            value={price}
                            onChangeText={setPrice}
                            placeholder='ex.: 150'
                            placeholderTextColor={colors.textSecondary}
                            keyboardType='numeric'
                            style={[
                                styles.input,
                                { borderColor: colors.border, backgroundColor: colors.background, color: colors.text },
                            ]}
                        />
                        <BoameBtn
                            title='Adicionar serviço'
                            onPress={handleAdd}
                            loading={isPending}
                            disabled={isPending}
                        />
                    </View>
                </KeyboardAvoidingView>
            )}
        </ScreenContainer>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: spacing.md,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    serviceInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    serviceName: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
    serviceDesc: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
    },
    footer: {
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    label: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md,
        marginBottom: spacing.sm,
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

