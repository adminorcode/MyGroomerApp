import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { BoamePhoneInput } from "../../components/shared/Input";
import { MGButton, MGIcon, MGIconButton, MGText, MGTextField } from "../../design-system/components";
import { useMGTheme } from "../../design-system/theme/useMGTheme";
import { radius, spacing } from "../../design-system/tokens";
import { tutorRegisterSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRegisterMutation } from "../../hooks/useAuth";
import { useGoogleSignInMutation } from "../../hooks/useGoogleAuth";
import GoogleSignInBtn from "../../components/shared/GoogleSignInBtn";
import AuthDivider from "../../components/shared/AuthDivider";
import { Role } from "../../types/auth.types";
import { useRuntime } from "../../context/RuntimeContext";
import { getErrorMessage } from "../../utils/error";
import { ArrowLeft } from 'lucide-react-native';
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
    const { colors } = useMGTheme();
    const [showPassword, setShowPassword] = useState(false);
    const scrollRef = useRef<KeyboardAwareScrollView>(null);
    // Posições do formulário e da caixa de consentimento dentro do conteúdo rolável (onLayout).
    const layoutRef = useRef({ form: 0, consent: 0 });

    const handleRegister: SubmitHandler<TutorFormValues> = (data) => {
        mutate({ ...data, role: Role.CUSTOMER });
    };

    // O consentimento fica abaixo da dobra: ao falhar nele, rola até a caixa para o erro aparecer.
    const handleInvalid: SubmitErrorHandler<TutorFormValues> = (formErrors) => {
        if (!formErrors.accepted_terms) return;
        const consentY = spacing.base + layoutRef.current.form + layoutRef.current.consent;
        scrollRef.current?.scrollToPosition(0, Math.max(0, consentY - spacing.huge), true);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.canvas }} edges={['top', 'left', 'right']}>
        <KeyboardAwareScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.container, { backgroundColor: colors.surface.canvas }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <View style={styles.content}>
            <View style={styles.heading}>
                <MGIconButton accessibilityLabel="Voltar" icon={<ArrowLeft size={spacing.xl} color={colors.action.primary} />} onPress={() => navigation.goBack()} />
                <MGText variant="heading1" accessibilityRole="header" style={{ flex: 1 }}>Criar minha conta</MGText>
            </View>
            <View style={[styles.intro, { backgroundColor: colors.surface.pinkSubtle }]}>
                <MGText>Encontre profissionais para cuidar do seu melhor amigo.</MGText>
            </View>
            <View style={styles.form} onLayout={(event) => { layoutRef.current.form = event.nativeEvent.layout.y }}>
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
                        <View>
                            <MGTextField
                                label="Senha"
                                placeholder="Crie uma senha"
                                onChangeText={onChange}
                                onBlur={onBlur}
                                value={value}
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="newPassword"
                                secureTextEntry={!showPassword}
                                error={errors.password?.message}
                            />
                            <MGButton
                                label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                variant="tertiary"
                                fullWidth={false}
                                disabled={isPending}
                                onPress={() => setShowPassword(previous => !previous)}
                                style={styles.passwordToggle}
                            />
                        </View>
                    )}
                />
                <Controller
                    control={control}
                    name="accepted_terms"
                    render={({ field: { onChange, value } }) => (
                        <View onLayout={(event) => { layoutRef.current.consent = event.nativeEvent.layout.y }}>
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
                                        {
                                            borderColor: errors.accepted_terms
                                                ? colors.feedback.error
                                                : value ? colors.action.primary : colors.border.strong,
                                            backgroundColor: value ? colors.action.primary : colors.surface.default,
                                        },
                                    ]}
                                >
                                    {value ? <MGIcon name="check" size={spacing.base} color={colors.onAction.primary} /> : null}
                                </View>
                                <MGText variant="bodySmall" style={styles.consentText}>
                                    Aceito os termos e a política de privacidade
                                </MGText>
                            </Pressable>
                            {errors.accepted_terms?.message && (
                                <MGText variant="bodySmall" color="error" accessibilityLiveRegion="polite" style={styles.error}>{errors.accepted_terms.message}</MGText>
                            )}
                        </View>
                    )}
                />
                {error && (
                    <MGText accessibilityRole="alert" variant="bodySmall" color="error" style={styles.error}>
                        {getErrorMessage(error)}
                    </MGText>
                )}
                <MGButton label="Criar conta" loading={isPending} onPress={handleSubmit(handleRegister, handleInvalid)} />
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
                    <MGText accessibilityRole="alert" variant="bodySmall" color="error" style={styles.error}>
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
    intro: { padding: spacing.base, borderRadius: radius.lg, marginBottom: spacing.lg },
    form: {
        width: "100%",
        gap: spacing.sm,
    },
    passwordToggle: {
        alignSelf: 'flex-end',
        marginTop: spacing.xs,
    },
    consentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        marginBottom: spacing.sm,
        minHeight: spacing.huge,
    },
    consentBox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderRadius: radius.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    consentText: {
        flex: 1,
    },
    error: {
        marginTop: spacing.xs,
    },
    loginLink: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
});
