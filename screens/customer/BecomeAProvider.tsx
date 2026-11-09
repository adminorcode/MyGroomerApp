import { AppAlert } from '../../utils/alert'
import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProfileStackParamList } from '../../navigation/types'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { providerSchema } from '../../validators/provider.validator'
import { MomoProvider, PayoutMethod } from '../../types/provider.types'
import { useRegisterAsProvider } from '../../hooks/useProviders'
import { BoamePhoneInput } from '../../components/shared/Input'
import { MGButton, MGCard, MGText, MGTextField } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { layout } from '../../constants/theme'
import { spacing } from '../../design-system/tokens'
import z from 'zod'
import MGArtwork from '../../design-system/components/MGArtwork'

type BecomeProviderNavigationProps = StackNavigationProp<ProfileStackParamList, 'BecomeAProvider'>

type Props = {
    navigation: BecomeProviderNavigationProps
}

type ProviderFormValues = z.infer<typeof providerSchema>

const payoutOptions = [
    { label: 'Dinheiro móvel', value: PayoutMethod.MOBILE_MONEY },
    { label: 'Banco', value: PayoutMethod.BANK },
] as const

const momoProviderOptions = [
    { label: 'MTN', value: MomoProvider.MTN },
    { label: 'Telecel', value: MomoProvider.TELECEL },
    { label: 'AirtelTigo', value: MomoProvider.AIRTEL_TIGO },
] as const

type OptionSelectorProps<T extends string> = {
    label: string
    options: readonly { label: string; value: T }[]
    value?: T
    onChange: (value: T) => void
    error?: string
}

function OptionSelector<T extends string>({ label, options, value, onChange, error }: OptionSelectorProps<T>) {
    const { colors, radius } = useMGTheme()
    return (
        <View style={styles.selectorGroup}>
            <MGText variant="label" style={styles.selectorLabel}>{label}</MGText>
            <View style={styles.selectorRow}>
                {options.map((option) => {
                    const isSelected = value === option.value
                    // R1: opção selecionada é ação e fica em action.primary com texto onAction.primary.
                    return (
                        <Pressable
                            key={option.value}
                            accessibilityRole='button'
                            accessibilityState={{ selected: isSelected }}
                            aria-selected={isSelected}
                            onPress={() => onChange(option.value)}
                            style={[
                                styles.option,
                                { borderRadius: radius.lg, borderColor: isSelected ? colors.action.primary : colors.border.default },
                                isSelected && { backgroundColor: colors.action.primary },
                            ]}
                        >
                            <MGText
                                variant="button"
                                style={{ textAlign: 'center', color: isSelected ? colors.onAction.primary : colors.text.primary }}
                            >
                                {option.label}
                            </MGText>
                        </Pressable>
                    )
                })}
            </View>
            {error && <MGText variant="caption" color="error" style={styles.error}>{error}</MGText>}
        </View>
    )
}

const SUBMIT_FAILED_MESSAGE = 'Não foi possível concluir o cadastro de groomer. Tente novamente.'

const BecomeAProvider = ({ navigation }: Props) => {
    const { mutateAsync, isPending } = useRegisterAsProvider()
    const { colors } = useMGTheme()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const { control, handleSubmit, watch, formState: { errors } } = useForm<ProviderFormValues>({
        resolver: zodResolver(providerSchema),
        defaultValues: {
            payout_method: PayoutMethod.MOBILE_MONEY,
            momo_number: '',
            momo_provider: undefined,
            bank_account_number: '',
            bank_account_name: '',
            service_area: '',
        },
    })

    const payoutMethod = watch('payout_method')

    const onSubmit: SubmitHandler<ProviderFormValues> = async (data) => {
        setSubmitError(null)
        try {
            await mutateAsync(data)
            AppAlert.alert('Bem-vindo!', 'Você agora é groomer.')
        } catch (error) {
            // Falha no envio fica na própria tela, junto do CTA; o alerta nativo não aparece na web.
            setSubmitError(SUBMIT_FAILED_MESSAGE)
        }
    }

    return (
        <KeyboardAwareScrollView
            style={{ backgroundColor: colors.surface.canvas }}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps='handled'
            extraScrollHeight={20}
            enableOnAndroid
        >
            <ScreenHeader
                title='Quero ser groomer'
                description='Defina como você quer receber'
                showBackButton
                onBack={() => navigation.goBack()}
            />

            {/* Bloco de convite: destaque 20 pt em tealSubtle com texto text.primary (R3, R5). */}
            <MGCard variant='teal' shape='hero' style={styles.invite}>
                <View style={styles.inviteText}>
                    <MGText variant='title' color='primary'>Ofereça seus serviços</MGText>
                    <MGText variant='bodySmall' color='primary'>Preencha seus dados para continuar.</MGText>
                </View>
                <MGArtwork name='professional' width={80} />
            </MGCard>

            <View style={styles.form}>
                <Controller
                    control={control}
                    name='payout_method'
                    render={({ field: { onChange, value } }) => (
                        <OptionSelector
                            label='Forma de repasse'
                            options={payoutOptions}
                            value={value}
                            onChange={onChange}
                            error={errors.payout_method?.message}
                        />
                    )}
                />

                {payoutMethod === PayoutMethod.MOBILE_MONEY ? (
                    <>
                        <Controller
                            control={control}
                            name='momo_number'
                            render={({ field: { onChange, value } }) => (
                                <BoamePhoneInput
                                    label='Número do dinheiro móvel'
                                    onChangeFormattedText={onChange}
                                    value={value}
                                    error={errors.momo_number?.message}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name='momo_provider'
                            render={({ field: { onChange, value } }) => (
                                <OptionSelector
                                    label='Operadora'
                                    options={momoProviderOptions}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.momo_provider?.message}
                                />
                            )}
                        />
                    </>
                ) : (
                    <>
                        <Controller
                            control={control}
                            name='bank_account_number'
                            render={({ field: { onChange, onBlur, value } }) => (
                                <MGTextField
                                    label='Número da conta'
                                    placeholder='Digite o número da conta'
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    value={value}
                                    keyboardType='number-pad'
                                    error={errors.bank_account_number?.message}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name='bank_account_name'
                            render={({ field: { onChange, onBlur, value } }) => (
                                <MGTextField
                                    label='Nome do titular'
                                    placeholder='Digite o nome do titular'
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    value={value}
                                    autoCapitalize='words'
                                    error={errors.bank_account_name?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="bank_code"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <MGTextField label="Código do banco" placeholder="Código do banco" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.bank_code?.message} />
                            )}
                        />
                    </>
                )}

                <Controller
                    control={control}
                    name='service_area'
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
                            label='Área de atendimento'
                            placeholder='ex.: São Paulo, Pinheiros'
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                            error={errors.service_area?.message}
                        />
                    )}
                />

                {submitError ? (
                    <MGText variant='bodySmall' color='error' accessibilityRole='alert'>{submitError}</MGText>
                ) : null}
                <MGButton
                    label='Cadastrar como groomer'
                    loading={isPending}
                    onPress={handleSubmit(onSubmit)}
                />
            </View>
        </KeyboardAwareScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: layout.formMaxWidth,
        alignSelf: 'center',
        flexGrow: 1,
        paddingHorizontal: layout.screenPadding,
        paddingBottom: spacing.xxl,
    },
    invite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    inviteText: {
        flex: 1,
        gap: spacing.xxs,
    },
    form: {
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    selectorGroup: {
        marginBottom: spacing.md,
    },
    selectorLabel: {
        marginBottom: spacing.sm,
    },
    selectorRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    option: {
        minHeight: 52,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
    },
    error: {
        marginTop: spacing.xs,
    },
})

export default BecomeAProvider
