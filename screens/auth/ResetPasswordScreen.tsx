import { StyleSheet, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { fonts, spacing, typography } from "../../constants/theme";
import { ToggleInput } from "../../components/shared/Input";
import { MGButton, MGText } from "../../design-system/components";
import { resetPasswordSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useResetPasswordMutation } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { getErrorMessage } from "../../utils/error";

type ResetPasswordNavigationProp = StackNavigationProp<AuthStackParamList, "ResetPassword">;
type ResetPasswordRouteProp = RouteProp<AuthStackParamList, "ResetPassword">;

type Props = {
    navigation: ResetPasswordNavigationProp;
    route: ResetPasswordRouteProp;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
    const { control, handleSubmit, formState: { errors } } = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: "" },
    });
    const { mutate, isPending, error, isSuccess } = useResetPasswordMutation();
    const { colors } = useTheme();

    const handleReset: SubmitHandler<z.infer<typeof resetPasswordSchema>> = (values) => {
        mutate({ token: route.params.token, password: values.password });
    };

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <MGText variant="heading1" color="brand" style={[styles.title, { fontFamily: fonts.logo }]}>
                Nova senha
            </MGText>
            {isSuccess ? (
                <View style={styles.form}>
                    <MGText accessibilityRole="alert" style={styles.help}>
                        Senha redefinida com sucesso
                    </MGText>
                    <MGButton label="Entrar" onPress={() => navigation.navigate("Login")} />
                </View>
            ) : (
                <View style={styles.form}>
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <ToggleInput
                                label="Nova senha"
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
                    <MGButton label="Redefinir senha" loading={isPending} onPress={handleSubmit(handleReset)} />
                    {error && (
                        <MGText accessibilityRole="alert" color="error" style={styles.error}>
                            {getErrorMessage(error)}
                        </MGText>
                    )}
                </View>
            )}
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
        marginBottom: spacing.lg,
    },
    help: {
        fontSize: typography.sizes.md,
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
});
