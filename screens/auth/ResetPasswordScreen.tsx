import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { MGButton, MGText, MGTextField } from "../../design-system/components";
import MGBrand from '../../design-system/components/MGBrand';
import { useMGTheme } from '../../design-system/theme/useMGTheme';
import { resetPasswordSchema } from "../../validators/auth.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import z from "zod";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useResetPasswordMutation } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/error";
import { SafeAreaView } from 'react-native-safe-area-context';

type ResetPasswordNavigationProp = StackNavigationProp<AuthStackParamList, "ResetPassword">;
type ResetPasswordRouteProp = RouteProp<AuthStackParamList, "ResetPassword">;

type Props = {
    navigation: ResetPasswordNavigationProp;
    route: ResetPasswordRouteProp;
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
            marginBottom: spacing.lg,
        },
        form: {
            width: "100%",
            maxWidth: 448,
            gap: spacing.sm,
        },
        toggle: {
            alignSelf: 'flex-start',
            paddingHorizontal: 0,
        },
        feedback: {
            marginTop: spacing.xs,
        },
    });
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
    const { control, handleSubmit, formState: { errors } } = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: "" },
    });
    const { mutate, isPending, error, isSuccess } = useResetPasswordMutation();
    const { colors, spacing } = useMGTheme();
    const styles = createStyles(spacing);
    const [visiblePassword, setVisiblePassword] = useState(false);

    const handleReset: SubmitHandler<z.infer<typeof resetPasswordSchema>> = (values) => {
        mutate({ token: route.params.token, password: values.password });
    };

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
                Nova senha
            </MGText>
            {isSuccess ? (
                <View style={styles.form}>
                    <MGText accessibilityRole="alert" variant="bodySmall" color="success" style={styles.feedback}>
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
                            <MGTextField
                                label="Nova senha"
                                placeholder="Crie uma senha"
                                onChangeText={onChange}
                                onBlur={onBlur}
                                value={value}
                                secureTextEntry={!visiblePassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="newPassword"
                                error={errors.password?.message}
                            />
                        )}
                    />
                    <MGButton
                        label={visiblePassword ? 'Ocultar senha' : 'Mostrar senha'}
                        variant="tertiary"
                        fullWidth={false}
                        disabled={isPending}
                        style={styles.toggle}
                        onPress={() => setVisiblePassword(previous => !previous)}
                    />
                    <MGButton label="Redefinir senha" loading={isPending} onPress={handleSubmit(handleReset)} />
                    {error && (
                        <MGText accessibilityRole="alert" variant="bodySmall" color="error" style={styles.feedback}>
                            {getErrorMessage(error)}
                        </MGText>
                    )}
                </View>
            )}
            </View>
        </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
