import { Pressable, StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { borderRadius, fonts, spacing, typography } from "../../constants/theme";
import { BoamePhoneInput, ToggleInput } from "../../components/shared/Input";
import { MGButton, MGText, MGTextField } from "../../design-system/components";
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
import { ArrowLeft } from 'lucide-react-native';
import { MGIconButton } from '../../design-system/components';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <View style={styles.content}>
            <View style={styles.heading}>
                <MGIconButton accessibilityLabel="Voltar" icon={<ArrowLeft size={spacing.xl} color={colors.text} />} onPress={() => navigation.goBack()} />
                <MGText variant="heading1" accessibilityRole="header" style={{ flex: 1 }}>Criar minha conta</MGText>
            </View>
            <View style={[styles.intro, { backgroundColor: colors.selectionSoft }]}>
                <MGText>Encontre profissionais para cuidar do seu melhor amigo.</MGText>
            </View>
            <View style={styles.form}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
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
                        <MGTextField
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
                                aria-checked={value}
                                accessibilityLabel="Aceito os termos e a política de privacidade"
                                onPress={() => onChange(!value)}
                                style={styles.consentRow}
                            >
                                <View
                                    style={[
                                        styles.consentBox,
                                        { borderColor: errors.accepted_terms ? colors.error : colors.textSecondary },
                                        value && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    ]}
                                >
                                    {value ? (
                                        <MGText style={[styles.consentMark, { color: colors.onPrimary }]}>✓</MGText>
                                    ) : null}
                                </View>
                                <MGText variant="bodySmall" style={styles.consentText}>
                                    Aceito os termos e a política de privacidade
                                </MGText>
                            </Pressable>
                            {errors.accepted_terms?.message && (
                                <MGText color="error" style={styles.error}>{errors.accepted_terms.message}</MGText>
                            )}
                        </View>
                    )}
                />
                <MGButton label="Criar conta" loading={isPending} onPress={handleSubmit(handleRegister)} />
                {error && (
                    <MGText accessibilityRole="alert" color="error" style={styles.error}>
                        {getErrorMessage(error)}
                    </MGText>
                )}
                {runtime.googleAuthEnabled && <>
                    <AuthDivider />
                    <GoogleSignInBtn
                        title="Cadastrar com Google"
                        loading={isGooglePending}
                        disabled={isPending}
                        onPress={() => signInWithGoogle()}
                    />
                </>}
                {googleError && (
                    <MGText accessibilityRole="alert" color="error" style={styles.error}>
                        {googleError.message}
                    </MGText>
                )}
            </View>
            <MGButton label="Já tem uma conta? Entrar" variant="tertiary" disabled={isPending || isGooglePending} style={styles.loginLink} onPress={() => navigation.navigate('Login')} />
            </View>
        </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.base,
        paddingBottom: spacing.huge,
    },
    content: {
        width: "100%",
        maxWidth: 448,
    },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    intro: { padding: spacing.base, borderRadius: borderRadius.xl, marginBottom: spacing.lg },
    form: {
        width: "100%",
        gap: spacing.sm,
    },
    consentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
        minHeight: spacing.huge,
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
    },
    error: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    loginLink: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
});
