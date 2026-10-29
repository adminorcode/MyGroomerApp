import { StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { fonts, spacing, typography } from "../../constants/theme";
import { MGButton, MGText, MGTextField } from "../../design-system/components";
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
            <MGText variant="heading1" color="brand" style={[styles.title, { fontFamily: fonts.logo }]}>
                Esqueci minha senha
            </MGText>
            <MGText variant="bodySmall" style={styles.help}>
                Informe o e-mail da sua conta. Vamos enviar o caminho para criar uma senha nova.
            </MGText>
            <View style={styles.form}>
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
                <MGButton label="Enviar" loading={isPending} onPress={handleSubmit(handleForgot)} />
                {waitingForEmail && (
                    <MGText accessibilityRole="alert" variant="bodySmall" style={styles.help}>
                        {data?.message ?? "E-mail de redefinição de senha enviado"}
                    </MGText>
                )}
                {error && (
                    <MGText accessibilityRole="alert" color="error" style={styles.error}>
                        {getErrorMessage(error)}
                    </MGText>
                )}
            </View>
            <MGText color="brand" style={styles.backLink} onPress={() => navigation.navigate("Login")}>
                Voltar ao login
            </MGText>
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
        marginBottom: spacing.md,
    },
    help: {
        width: "100%",
        maxWidth: 448,
        marginBottom: spacing.lg,
    },
    form: {
        width: "100%",
        maxWidth: 448,
        gap: spacing.sm,
    },
    error: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    backLink: {
        marginTop: spacing.lg,
    },
});
