import { AppAlert } from '../../utils/alert'
import { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { useTheme } from '../../context/ThemeContext'
import { useUpdateProviderService } from '../../hooks/useProviders'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import BoameBtn from '../../components/shared/BoameBtn'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

type EditServiceNavigationProp = StackNavigationProp<ProviderServicesStackParamList, 'EditService'>
type EditServiceRouteProp = RouteProp<ProviderServicesStackParamList, 'EditService'>

type Props = {
    navigation: EditServiceNavigationProp
    route: EditServiceRouteProp
}

export default function EditService({ navigation, route }: Props) {
    const { colors } = useTheme()
    const { providerServiceId, serviceName, price: initialPrice } = route.params
    const { mutateAsync: updateProviderService, isPending } = useUpdateProviderService()

    const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : '')

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
                {serviceName && (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.serviceName, { color: colors.text }]}>{serviceName}</Text>
                    </View>
                )}

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
                    title='Salvar alterações'
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
    card: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.lg,
    },
    serviceName: {
        fontSize: typography.sizes.lg,
        fontFamily: fonts.semibold,
    },
    label: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
        marginBottom: spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md,
        marginBottom: spacing.lg,
    },
})

