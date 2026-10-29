import { StyleSheet, Text, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { fonts, spacing, typography } from "../../constants/theme";
import BoameInput from "../../components/shared/Input";
import BoameBtn from "../../components/shared/BoameBtn";
import { forgotPasswordSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useForgotPasswordMutation } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { getErrorMessage } from "../../utils/error";

type ForgotPasswordNavigationProp = StackNavigationProp<AuthStackParamList, "ForgotPassword">;

type Props = {
    navigation: ForgotPasswordNavigationProp;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
    const { control, handleSubmit, formState: { errors } } = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });
    const { mutate, isPending, error, isSuccess, data } = useForgotPasswordMutation();
    const { colors } = useTheme();

    const handleForgot: SubmitHandler<z.infer<typeof forgotPasswordSchema>> = (values) => {
        mutate(values.email);
    };

    const waitingForEmail = isSuccess && !data?.reset_token;

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <Text style={[styles.title, { color: colors.brand }]}>Esqueci minha senha</Text>
            <Text style={[styles.help, { color: colors.text }]}>
                Informe o e-mail da sua conta. Vamos enviar o caminho para criar uma senha nova.
            </Text>
            <View style={styles.form}>
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
                <BoameBtn title="Enviar" loading={isPending} onPress={handleSubmit(handleForgot)} />
                {waitingForEmail && (
                    <Text accessibilityRole="alert" style={[styles.help, { color: colors.text }]}>
                        {data?.message ?? "E-mail de redefinição de senha enviado"}
                    </Text>
                )}
                {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{getErrorMessage(error)}</Text>}
            </View>
            <Text style={[styles.backLink, { color: colors.primary }]} onPress={() => navigation.navigate("Login")}>
                Voltar ao login
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
        marginBottom: spacing.md,
    },
    help: {
        width: "100%",
        maxWidth: 448,
        fontFamily: fonts.regular,
        fontSize: typography.sizes.sm,
        marginBottom: spacing.lg,
    },
    form: {
        width: "100%",
        maxWidth: 448,
        gap: spacing.sm,
    },
    error: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.xs,
    },
    backLink: {
        marginTop: spacing.lg,
        fontFamily: fonts.regular,
    },
});
