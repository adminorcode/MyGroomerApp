import { StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { MGButton, MGText, MGTextField } from "../../design-system/components";
import MGBrand from '../../design-system/components/MGBrand';
import { useMGTheme } from '../../design-system/theme/useMGTheme';
import { forgotPasswordSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useForgotPasswordMutation } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/error";
import { SafeAreaView } from 'react-native-safe-area-context';

type ForgotPasswordNavigationProp = StackNavigationProp<AuthStackParamList, "ForgotPassword">;

type Props = {
    navigation: ForgotPasswordNavigationProp;
};

type Spacing = ReturnType<typeof useMGTheme>['spacing'];

function createStyles(spacing: Spacing) {
    return StyleSheet.create({
        container: {
            flexGrow: 1,
            alignItems: "center",
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.huge,
        },
        content: { width: '100%', maxWidth: 448 },
        brand: { alignItems: 'center', marginBottom: spacing.xxl },
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
        feedback: {
            marginTop: spacing.xs,
        },
        backLink: {
            marginTop: spacing.lg,
        },
    });
}

export default function ForgotPasswordScreen({ navigation }: Props) {
    const { control, handleSubmit, formState: { errors } } = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });
    const { mutate, isPending, error, isSuccess, data } = useForgotPasswordMutation();
    const { colors, spacing } = useMGTheme();
    const styles = createStyles(spacing);

    const handleForgot: SubmitHandler<z.infer<typeof forgotPasswordSchema>> = (values) => {
        mutate(values.email);
    };

    const waitingForEmail = isSuccess && !data?.reset_token;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.canvas }} edges={['top', 'left', 'right']}>
        <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.surface.canvas }]}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableOnAndroid
        >
            <View style={styles.content}>
            <View style={styles.brand}><MGBrand compact /></View>
            <MGText variant="heading1" accessibilityRole="header" style={styles.title}>
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
                    <MGText accessibilityRole="alert" variant="bodySmall" color="success" style={styles.feedback}>
                        {data?.message ?? "E-mail de redefinição de senha enviado"}
                    </MGText>
                )}
                {error && (
                    <MGText accessibilityRole="alert" variant="bodySmall" color="error" style={styles.feedback}>
                        {getErrorMessage(error)}
                    </MGText>
                )}
            </View>
            <MGButton label="Voltar ao login" variant="tertiary" disabled={isPending} style={styles.backLink} onPress={() => navigation.navigate('Login')} />
            </View>
        </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
