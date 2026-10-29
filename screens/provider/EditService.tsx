import { AppAlert } from '../../utils/alert'
import { useState } from 'react'
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { useUpdateProviderService } from '../../hooks/useProviders'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGTextField } from '../../design-system/components'
import { ServiceEditorCard } from '../../design-system/patterns'
import { spacing } from '../../constants/theme'
import { formatMoney } from '../../utils/formatMoney'

type EditServiceNavigationProp = StackNavigationProp<ProviderServicesStackParamList, 'EditService'>
type EditServiceRouteProp = RouteProp<ProviderServicesStackParamList, 'EditService'>

type Props = {
    navigation: EditServiceNavigationProp
    route: EditServiceRouteProp
}

export default function EditService({ navigation, route }: Props) {
    const { providerServiceId, serviceName, price: initialPrice } = route.params
    const { mutateAsync: updateProviderService, isPending } = useUpdateProviderService()

    const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : '')

    const parsedPreview = Number(price)
    const previewPrice = !price.trim() || isNaN(parsedPreview) || parsedPreview <= 0
        ? (initialPrice != null ? formatMoney(initialPrice) : undefined)
        : formatMoney(parsedPreview)

    const handleSave = async () => {
        const parsedPrice = Number(price)
        if (!price.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
            AppAlert.alert('Preço inválido', 'Informe um preço maior que zero.')
            return
        }

        try {
            await updateProviderService({ providerServiceId, price: parsedPrice })
            navigation.goBack()
        } catch (error) {
            AppAlert.alert('Não foi possível atualizar o preço', 'Algo deu errado. Tente novamente.')
        }
    }

    return (
        <ScreenContainer>
            <ScreenHeader
                title='Editar serviço'
                description={serviceName ? `Atualize o preço de ${serviceName}` : 'Atualize o preço'}
                showBackButton
                onBack={() => navigation.goBack()}
            />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {serviceName ? (
                    <View style={styles.preview}>
                        <ServiceEditorCard
                            name={serviceName}
                            prices={previewPrice ? { medium: previewPrice } : undefined}
                        />
                    </View>
                ) : null}

                <MGTextField
                    label="Preço (R$)"
                    value={price}
                    onChangeText={setPrice}
                    placeholder="ex.: 150"
                    keyboardType="numeric"
                />

                <MGButton
                    label="Salvar alterações"
                    onPress={handleSave}
                    loading={isPending}
                    disabled={isPending}
                />
            </KeyboardAvoidingView>
        </ScreenContainer>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    preview: {
        marginBottom: spacing.lg,
    },
})
