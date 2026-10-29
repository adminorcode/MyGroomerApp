import { View, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { useLoginMutation } from "../../hooks/useAuth";
import { useGoogleSignInMutation } from "../../hooks/useGoogleAuth";
import GoogleSignInBtn from "../../components/shared/GoogleSignInBtn";
import AuthDivider from "../../components/shared/AuthDivider";
import { fonts, spacing, typography } from "../../constants/theme";
import { ToggleInput } from "../../components/shared/Input";
import { MGButton, MGText, MGTextField } from "../../design-system/components";
import { loginSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view'
import { useTheme } from "../../context/ThemeContext";
import { useRuntime } from '../../context/RuntimeContext'
import { getErrorMessage } from '../../utils/error'

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>

type Props = {
    navigation: LoginScreenNavigationProp
}

export default function LoginScreen({navigation}: Props) {
    const {control, handleSubmit, formState: {errors}} = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })
    const { mutate, isPending, error} = useLoginMutation()
    const { mutate: signInWithGoogle, isPending: isGooglePending, error: googleError } = useGoogleSignInMutation()
    const { colors } = useTheme();
    const runtime = useRuntime()
    const handleLogin: SubmitHandler<z.infer<typeof loginSchema>> = (data) => {
        mutate(data)
    }

    return (
        <KeyboardAwareScrollView 
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid={true}
        >
            <View style={styles.content}>
            <MGText variant="heading1" color="brand" style={[styles.title, { fontFamily: fonts.logo }]}>
                Acesse sua conta
            </MGText>
            <View style={styles.form}>
                <Controller
                    control={control}
                    name="email"
                    render={({field: {onChange, onBlur, value}}) => (
                        <MGTextField
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
                    render={({field: {onChange, onBlur, value}}) => (
                        <ToggleInput
                            label="Senha"
                            style={styles.input}
                            placeholder="Digite sua senha"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="password"
                            error={errors.password?.message}
                        />
                    )}
                />
                <MGText
                    color="brand"
                    style={styles.forgotLink}
                    onPress={() => navigation.navigate("ForgotPassword")}
                >
                    Esqueci minha senha
                </MGText>
                <MGButton
                    label="Entrar"
                    loading={isPending}
                    onPress={handleSubmit(handleLogin)}
                />
                {error && (
                    <MGText accessibilityRole="alert" color="error" style={styles.error}>
                        {getErrorMessage(error)}
                    </MGText>
                )}
                {runtime.googleAuthEnabled && <><AuthDivider /><GoogleSignInBtn
                    title="Entrar com Google"
                    loading={isGooglePending}
                    disabled={isPending}
                    onPress={() => signInWithGoogle()}
                /></>}
                {googleError && (
                    <MGText color="error" style={styles.error}>
                        {googleError.message}
                    </MGText>
                )}
            </View>
            <MGText
                color="brand"
                style={styles.registerLink}
                onPress={() => navigation.navigate("TutorRegister")}
            >
                Não tem uma conta? Cadastre-se
            </MGText>
            </View>
        </KeyboardAwareScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.huge,
    },
    content: {
        width: '100%',
        maxWidth: 448,
    },
    title: {
        marginBottom: spacing.lg,
    },
    form: {
        width: '100%',
        gap: spacing.sm,
    },
    input: {
        fontFamily: fonts.regular,
    },
    error: {
        fontSize: typography.sizes.sm,
        marginTop: 4,
    },
    forgotLink: {
        marginBottom: spacing.sm,
    },
    registerLink: {
        marginTop: 24,
    },
});
