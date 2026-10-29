import { View, Text, StyleSheet, ScrollView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { useLoginMutation } from "../../hooks/useAuth";
import { useGoogleSignInMutation } from "../../hooks/useGoogleAuth";
import GoogleSignInBtn from "../../components/shared/GoogleSignInBtn";
import AuthDivider from "../../components/shared/AuthDivider";
import { fonts, spacing, typography } from "../../constants/theme";
import BoameInput, { ToggleInput } from "../../components/shared/Input";
import BoameBtn from "../../components/shared/BoameBtn";
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
            <Text style={[styles.title, { color: colors.brand }]}>Boa me</Text>
            <View style={styles.form}>
                <Controller
                    control={control}
                    name="email"
                    render={({field: {onChange, onBlur, value}}) => (
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
                    render={({field: {onChange, onBlur, value}}) => (
                        <ToggleInput
                            label="Password"
                            style={styles.input}
                            placeholder="Enter your password"
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
                <BoameBtn
                    title="Login"
                    loading={isPending}
                    onPress={handleSubmit(handleLogin)}
                />
                {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{getErrorMessage(error)}</Text>}
                {runtime.googleAuthEnabled && <><AuthDivider /><GoogleSignInBtn
                    title="Log in with Google"
                    loading={isGooglePending}
                    disabled={isPending}
                    onPress={() => signInWithGoogle()}
                /></>}
                {googleError && <Text style={[styles.error, { color: colors.error }]}>{googleError.message}</Text>}
            </View>
            <Text style={[styles.registerLink, { color: colors.primary }]} onPress={() => navigation.navigate("Register")}>
                Don&apos;t have an account? Register
            </Text>
        </KeyboardAwareScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
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
        width: '100%',
        maxWidth: 448,
        gap: 10,
    },
    input: {
        fontFamily: fonts.regular,
    },
    error: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: 4,
    },
    registerLink: {
        marginTop: 24,
        fontFamily: fonts.regular,
    },
});
