import { Pressable, StyleSheet, Text, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { borderRadius, fonts, spacing, typography } from "../../constants/theme";
import BoameInput, { BoamePhoneInput, ToggleInput } from "../../components/shared/Input";
import BoameBtn from "../../components/shared/BoameBtn";
import { tutorRegisterSchema } from "../../validators/auth.validator";
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
import { useRuntime } from "../../context/RuntimeContext";
import { getErrorMessage } from "../../utils/error";

type TutorRegisterNavigationProp = StackNavigationProp<AuthStackParamList, "TutorRegister">;

type Props = {
    navigation: TutorRegisterNavigationProp;
};

type TutorFormValues = z.infer<typeof tutorRegisterSchema>;

export default function TutorRegisterScreen({ navigation }: Props) {
    const { control, handleSubmit, formState: { errors } } = useForm<TutorFormValues>({
        resolver: zodResolver(tutorRegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            phone_number: "",
            accepted_terms: false,
        },
    });
    const { mutate, isPending, error } = useRegisterMutation();
    const runtime = useRuntime();
    const { mutate: signInWithGoogle, isPending: isGooglePending, error: googleError } = useGoogleSignInMutation();
    const { colors } = useTheme();

    const handleRegister: SubmitHandler<TutorFormValues> = (data) => {
        mutate({ ...data, role: Role.CUSTOMER });
    };

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <Text style={[styles.title, { color: colors.brand }]}>Criar conta</Text>
            <View style={styles.form}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <BoameInput
                            label="Nome completo"
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
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <ToggleInput
                            label="Senha"
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
                    name="accepted_terms"
                    render={({ field: { onChange, value } }) => (
                        <View>
                            <Pressable
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: value }}
                                onPress={() => onChange(!value)}
                                style={styles.consentRow}
                            >
                                <View
                                    style={[
                                        styles.consentBox,
                                        { borderColor: errors.accepted_terms ? colors.error : colors.border },
                                        value && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    ]}
                                >
                                    {value ? <Text style={[styles.consentMark, { color: colors.onPrimary }]}>✓</Text> : null}
                                </View>
                                <Text style={[styles.consentText, { color: colors.text }]}>
                                    Aceito os termos e a política de privacidade
                                </Text>
                            </Pressable>
                            {errors.accepted_terms?.message && (
                                <Text style={[styles.error, { color: colors.error }]}>{errors.accepted_terms.message}</Text>
                            )}
                        </View>
                    )}
                />
                <BoameBtn title="Criar conta" loading={isPending} onPress={handleSubmit(handleRegister)} />
                {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{getErrorMessage(error)}</Text>}
                {runtime.googleAuthEnabled && <>
                    <AuthDivider />
                    <GoogleSignInBtn
                        title="Cadastrar com Google"
                        loading={isGooglePending}
                        disabled={isPending}
                        onPress={() => signInWithGoogle()}
                    />
                </>}
                {googleError && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{googleError.message}</Text>}
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
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.huge,
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
        gap: spacing.sm,
    },
    consentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    consentBox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderRadius: borderRadius.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    consentMark: {
        fontFamily: fonts.semibold,
        fontSize: typography.sizes.sm,
    },
    consentText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: typography.sizes.sm,
    },
    error: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.xs,
    },
    loginLink: {
        marginTop: spacing.lg,
        fontFamily: fonts.regular,
        paddingBottom: 100,
    },
});
