import { Pressable, StyleSheet, Text, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { fonts, spacing, typography } from "../../constants/theme";
import BoameInput, { BoamePhoneInput, ToggleInput } from "../../components/shared/Input";
import BoameBtn from "../../components/shared/BoameBtn";
import { registerSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRegisterMutation } from "../../hooks/useAuth";
import { useGoogleSignInMutation } from "../../hooks/useGoogleAuth";
import GoogleSignInBtn from "../../components/shared/GoogleSignInBtn";
import AuthDivider from "../../components/shared/AuthDivider";
import { Role } from "../../types/auth.types";
import { useTheme } from "../../context/ThemeContext";
import { MomoProvider, PayoutMethod } from "../../types/provider.types";
import { useRuntime } from '../../context/RuntimeContext'
import { getErrorMessage } from '../../utils/error'

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Register">;

type Props = {
    navigation: RegisterScreenNavigationProp;
};

type RegisterFormValues = z.infer<typeof registerSchema>;

const payoutOptions = [
    { label: "Dinheiro móvel", value: PayoutMethod.MOBILE_MONEY },
    { label: "Banco", value: PayoutMethod.BANK },
] as const;

const momoProviderOptions = [
    { label: "MTN", value: MomoProvider.MTN },
    { label: "Telecel", value: MomoProvider.TELECEL },
    { label: "AirtelTigo", value: MomoProvider.AIRTEL_TIGO },
] as const;

type OptionSelectorProps<T extends string> = {
    label: string;
    options: readonly { label: string; value: T }[];
    value?: T;
    onChange: (value: T) => void;
    error?: string;
};

function OptionSelector<T extends string>({ label, options, value, onChange, error }: OptionSelectorProps<T>) {
    const { colors } = useTheme();
    return (
        <View style={styles.selectorGroup}>
            <Text style={[styles.selectorLabel, { color: colors.primary }]}>{label}</Text>
            <View style={styles.selectorRow}>
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <Pressable
                            key={option.value}
                            accessibilityRole="button"
                            onPress={() => onChange(option.value)}
                            style={[
                                styles.roleOption,
                                { borderColor: colors.border },
                                isSelected && { borderColor: colors.selection, backgroundColor: colors.selection },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.roleOptionText,
                                    { color: colors.text },
                                    isSelected && { color: colors.onSelection },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    );
}

export default function RegisterScreen({ navigation }: Props) {
    const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: Role.PROVIDER,
            payout_method: PayoutMethod.MOBILE_MONEY,
            momo_number: "",
            momo_provider: undefined,
            bank_account_number: "",
            bank_account_name: "",
            service_area: "",
        },
    });
    const { mutate, isPending, error } = useRegisterMutation();
    const runtime = useRuntime()
    const { mutate: signInWithGoogle, isPending: isGooglePending, error: googleError } = useGoogleSignInMutation();
    const payoutMethod = watch("payout_method");
    const { colors } = useTheme();

    const handleRegister: SubmitHandler<RegisterFormValues> = (data) => {
        mutate(data);
    };

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <Text style={[styles.backLink, { color: colors.primary }]} onPress={() => navigation.navigate("Welcome")}>
                Voltar
            </Text>
            <Text style={[styles.title, { color: colors.brand }]}>Cadastro profissional</Text>
            <View style={styles.form}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <BoameInput
                            label="Nome completo"
                            style={styles.input}
                            placeholder="Digite seu nome"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                            autoCapitalize="words"
                            autoCorrect={false}
                            textContentType="name"
                            error={errors.name?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <BoameInput
                            label="E-mail"
                            style={styles.input}
                            placeholder="Digite seu e-mail"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                            error={errors.email?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <ToggleInput
                            label="Senha"
                            style={styles.input}
                            placeholder="Crie uma senha"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="newPassword"
                            error={errors.password?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="phone_number"
                    render={({ field: { onChange, value } }) => (
                       <BoamePhoneInput
                            label="Telefone"
                            onChangeFormattedText={onChange}
                            value={value}
                            error={errors.phone_number?.message}
                        />
                    )}
                />

                        <Controller
                            control={control}
                            name="payout_method"
                            render={({ field: { onChange, value } }) => (
                                <OptionSelector
                                    label="Forma de repasse"
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
                                    name="momo_number"
                                    render={({ field: { onChange, value } }) => (
                                        <BoamePhoneInput
                                            label="Número do dinheiro móvel"
                                            onChangeFormattedText={onChange}
                                            value={value}
                                            error={errors.momo_number?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="momo_provider"
                                    render={({ field: { onChange, value } }) => (
                                        <OptionSelector
                                            label="Operadora"
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
                                    name="bank_account_number"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <BoameInput
                                            label="Número da conta"
                                            placeholder="Digite o número da conta"
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            value={value}
                                            keyboardType="number-pad"
                                            error={errors.bank_account_number?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="bank_account_name"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <BoameInput
                                            label="Nome do titular"
                                            placeholder="Digite o nome do titular"
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            value={value}
                                            autoCapitalize="words"
                                            error={errors.bank_account_name?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="bank_code"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <BoameInput label="Código do banco" placeholder="Código do banco" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.bank_code?.message} />
                                    )}
                                />
                            </>
                        )}

                        <Controller
                            control={control}
                            name="service_area"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <BoameInput
                                    label="Área de atendimento"
                                    placeholder="ex.: São Paulo, Pinheiros"
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    value={value}
                                    error={errors.service_area?.message}
                                />
                            )}
                        />

                <BoameBtn
                    title="Cadastrar"
                    loading={isPending}
                    onPress={handleSubmit(handleRegister)}
                />
                {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{getErrorMessage(error)}</Text>}
                {runtime.googleAuthEnabled && <><AuthDivider /><GoogleSignInBtn
                    title="Cadastrar com Google"
                    loading={isGooglePending}
                    disabled={isPending}
                    onPress={() => signInWithGoogle()}
                /></>}
                {googleError && <Text style={[styles.error, { color: colors.error }]}>{googleError.message}</Text>}
            </View>
            <Text style={[styles.loginLink, { color: colors.primary }]} onPress={() => navigation.navigate("Login")}>
                Já tem uma conta? Entrar
            </Text>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 96,
        paddingBottom: 100,
    },
    backLink: {
        alignSelf: "flex-start",
        width: "100%",
        maxWidth: 448,
        fontFamily: fonts.regular,
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontFamily: fonts.logo,
        marginBottom: spacing.lg,
    },
    form: {
        width: "100%",
        maxWidth: 448,
        gap: 10,
    },
    input: {
        fontFamily: fonts.regular,
    },
    selectorGroup: {
        marginBottom: 12,
    },
    selectorLabel: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginBottom: spacing.sm
    },
    selectorRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    roleOption: {
        flex: 1,
        alignItems: "center",
        paddingVertical: spacing.sm + 4,
        borderWidth: 1,
        borderRadius: 12
    },
    roleOptionText: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
    },
    error: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: 4,
    },
    loginLink: {
        marginTop: spacing.lg,
        fontFamily: fonts.regular,
        paddingBottom: 100,
    },
});
