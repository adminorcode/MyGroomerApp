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

const roleOptions = [
    { label: "Customer", value: Role.CUSTOMER },
    { label: "Provider", value: Role.PROVIDER },
] as const;

const payoutOptions = [
    { label: "Mobile Money", value: PayoutMethod.MOBILE_MONEY },
    { label: "Bank", value: PayoutMethod.BANK },
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
    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: Role.CUSTOMER,
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
    const selectedRole = watch("role");
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
            <Text style={[styles.title, { color: colors.brand }]}>Create account</Text>
            <View style={styles.form}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <BoameInput
                            label="Full name"
                            style={styles.input}
                            placeholder="Enter your name"
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
                            label="Email address"
                            style={styles.input}
                            placeholder="Enter your email"
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
                            label="Password"
                            style={styles.input}
                            placeholder="Create a password"
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
                            label="Phone number"
                            onChangeFormattedText={onChange}
                            value={value}
                            error={errors.phone_number?.message}
                        />
                    )}
                />

                <View style={styles.selectorGroup}>
                    <Text style={[styles.selectorLabel, { color: colors.primary }]}>I am a</Text>
                    <View style={styles.selectorRow}>
                        {roleOptions.map(({ label, value }) => (
                            <Pressable
                                key={value}
                                accessibilityRole="button"
                                onPress={() => setValue("role", value, { shouldValidate: true })}
                                style={[
                                    styles.roleOption,
                                    { borderColor: colors.border },
                                    selectedRole === value && { borderColor: colors.selection, backgroundColor: colors.selection },
                                ]}
                            >
                                <Text
                                    style={[
                                        {...styles.roleOptionText, color: colors.text},
                                        selectedRole === value && {color: colors.onSelection},
                                    ]}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {errors.role?.message && (
                        <Text style={[styles.error, { color: colors.error }]}>{errors.role.message}</Text>
                    )}
                </View>

                {selectedRole === Role.PROVIDER && (
                    <>
                        <Controller
                            control={control}
                            name="payout_method"
                            render={({ field: { onChange, value } }) => (
                                <OptionSelector
                                    label="Payout method"
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
                                            label="Mobile Money number"
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
                                            label="Mobile Money provider"
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
                                            label="Bank account number"
                                            placeholder="Enter your account number"
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
                                            label="Account holder name"
                                            placeholder="Enter the name on the account"
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
                                        <BoameInput label="Bank code" placeholder="Bank code" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.bank_code?.message} />
                                    )}
                                />
                            </>
                        )}

                        <Controller
                            control={control}
                            name="service_area"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <BoameInput
                                    label="Service area"
                                    placeholder="e.g. Accra, East Legon"
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    value={value}
                                    error={errors.service_area?.message}
                                />
                            )}
                        />
                    </>
                )}

                <BoameBtn
                    title="Register"
                    loading={isPending}
                    onPress={handleSubmit(handleRegister)}
                />
                {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{getErrorMessage(error)}</Text>}
                {runtime.googleAuthEnabled && <><AuthDivider /><GoogleSignInBtn
                    title="Sign up with Google"
                    loading={isGooglePending}
                    disabled={isPending}
                    onPress={() => signInWithGoogle()}
                /></>}
                {googleError && <Text style={[styles.error, { color: colors.error }]}>{googleError.message}</Text>}
            </View>
            <Text style={[styles.loginLink, { color: colors.primary }]} onPress={() => navigation.navigate("Login")}>
                Already have an account? Login
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
