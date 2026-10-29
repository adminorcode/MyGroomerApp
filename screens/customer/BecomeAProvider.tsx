import { AppAlert } from '../../utils/alert'
import { View, Text, Alert, Pressable, StyleSheet } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProfileStackParamList } from '../../navigation/types'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { providerSchema } from '../../validators/provider.validator'
import { useTheme } from '../../context/ThemeContext'
import { MomoProvider, PayoutMethod } from '../../types/provider.types'
import { useRegisterAsProvider } from '../../hooks/useProviders'
import BoameInput, { BoamePhoneInput } from '../../components/shared/Input'
import BoameBtn from '../../components/shared/BoameBtn'
import { borderRadius, fonts, layout, spacing, typography } from '../../constants/theme'
import z from 'zod'

type BecomeProviderNavigationProps = StackNavigationProp<ProfileStackParamList, 'BecomeAProvider'>

type Props = {
    navigation: BecomeProviderNavigationProps
}

type ProviderFormValues = z.infer<typeof providerSchema>

const payoutOptions = [
    { label: 'Mobile Money', value: PayoutMethod.MOBILE_MONEY },
    { label: 'Bank', value: PayoutMethod.BANK },
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
    const { colors } = useTheme()
    return (
        <View style={styles.selectorGroup}>
            <Text style={[styles.selectorLabel, { color: colors.primary }]}>{label}</Text>
            <View style={styles.selectorRow}>
                {options.map((option) => {
                    const isSelected = value === option.value
                    return (
                        <Pressable
                            key={option.value}
                            accessibilityRole='button'
                            onPress={() => onChange(option.value)}
                            style={[
                                styles.option,
                                { borderColor: colors.border },
                                isSelected && { borderColor: colors.selection, backgroundColor: colors.selection },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    { color: colors.text },
                                    isSelected && { color: colors.onSelection },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    )
                })}
            </View>
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    )
}

const BecomeAProvider = ({ navigation }: Props) => {
    const { mutateAsync, isPending } = useRegisterAsProvider()
    const { colors } = useTheme()
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
        try {
            await mutateAsync(data)
            AppAlert.alert('Welcome!', "You're now a provider.")
        } catch (error) {
            AppAlert.alert('Registration failed', 'Could not register as a provider. Please try again.')
        }
    }

    return (
        <KeyboardAwareScrollView
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps='handled'
            extraScrollHeight={20}
            enableOnAndroid
        >
            <ScreenHeader
                title='Become A Provider'
                description='Set up how you want to get paid'
                showBackButton
                onBack={() => navigation.goBack()}
            />

            <View style={styles.form}>
                <Controller
                    control={control}
                    name='payout_method'
                    render={({ field: { onChange, value } }) => (
                        <OptionSelector
                            label='Payout method'
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
                                    label='Mobile Money number'
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
                                    label='Mobile Money provider'
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
                                <BoameInput
                                    label='Bank account number'
                                    placeholder='Enter your account number'
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
                                <BoameInput
                                    label='Account holder name'
                                    placeholder='Enter the name on the account'
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
                                <BoameInput label="Bank code" placeholder="Bank code" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.bank_code?.message} />
                            )}
                        />
                    </>
                )}

                <Controller
                    control={control}
                    name='service_area'
                    render={({ field: { onChange, onBlur, value } }) => (
                        <BoameInput
                            label='Service area'
                            placeholder='e.g. Accra, East Legon'
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                            error={errors.service_area?.message}
                        />
                    )}
                />

                <BoameBtn
                    title='Register as Provider'
                    loading={isPending}
                    onPress={handleSubmit(onSubmit)}
                />
            </View>
        </KeyboardAwareScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: layout.screenPadding,
        paddingBottom: spacing.xxl,
    },
    form: {
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    selectorGroup: {
        marginBottom: 12,
    },
    selectorLabel: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginBottom: spacing.sm,
    },
    selectorRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    option: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm + 4,
        borderWidth: 1,
        borderRadius: borderRadius.lg,
    },
    optionText: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
    },
    error: {
        fontSize: typography.sizes.xs,
        fontFamily: fonts.regular,
        marginTop: 4,
    },
})

export default BecomeAProvider

