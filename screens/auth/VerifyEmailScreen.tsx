import { useEffect, useRef } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { Mail, MailCheck } from 'lucide-react-native'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { radius, spacing } from '../../design-system/tokens'
import { MGErrorState, MGScreen, MGText } from '../../design-system/components'
import MGBrand from '../../design-system/components/MGBrand'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../../navigation/types'
import { useVerifyEmailMutation } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/error'
import axios from 'axios'

type Props = {
    navigation: StackNavigationProp<AuthStackParamList, 'VerifyEmail'>
}

// A API responde 404 quando o token não corresponde a nenhuma conta (link inválido ou já usado).
// Mostra o texto de link expirado já existente nesta tela, em vez da mensagem técnica da API.
function verifyErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error) && error.response?.status === 404) return 'O link pode ter expirado.'
    return getErrorMessage(error)
}

export default function VerifyEmailScreen({ navigation }: Props) {
    const route = useRoute()
    const { mutate, isPending, isSuccess, isError, error } = useVerifyEmailMutation()
    const { colors } = useMGTheme();
    
    const params = route.params as { token?: string }
    const hasMutated = useRef(false)
    useEffect(() => {
        // extract token from deep link params
        if (params?.token && !hasMutated.current) {
            mutate({ token: params.token })
            hasMutated.current = true
        }
    }, [params?.token])


    useEffect(()=>{
        if (isSuccess) {
            const timer = setTimeout(() => {
                navigation.navigate('Login')
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isSuccess])


    return (
        <MGScreen scrollable contentStyle={styles.container}>
            <View style={styles.content}>
                <MGBrand compact />
                <View style={styles.status} accessibilityLiveRegion="polite">
                    {isPending ? <>
                        <View testID="verify-email-status" style={[styles.iconBlock, { backgroundColor: colors.surface.pinkSubtle }]}>
                            <ActivityIndicator accessibilityLabel="Verificando e-mail" color={colors.action.primary} size="large" />
                        </View>
                        <MGText color="secondary" style={styles.message}>Verificando seu e-mail...</MGText>
                    </> : isError ? <MGErrorState
                        message={error ? verifyErrorMessage(error) : 'O link pode ter expirado.'}
                        onRetry={() => navigation.navigate('Login')}
                        retryLabel="Voltar ao login"
                    /> : <>
                        <View testID="verify-email-status" style={[styles.iconBlock, { backgroundColor: colors.surface.pinkSubtle }]}>
                            {isSuccess
                                ? <MailCheck size={spacing.xxxl} color={colors.feedback.success} />
                                : <Mail size={spacing.xxxl} color={colors.action.primary} />}
                        </View>
                        <MGText variant="heading1" accessibilityRole="header" style={styles.message}>{isSuccess ? 'E-mail verificado!' : 'Confira seu e-mail'}</MGText>
                        <MGText color="secondary" style={styles.message}>{isSuccess ? 'Sua conta está pronta. Você já pode entrar.' : 'Enviamos um link de verificação para o seu e-mail. Toque nele para confirmar a conta.'}</MGText>
                    </>}
                </View>
            </View>
        </MGScreen>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
    },
    content: { width: '100%', maxWidth: 448, alignItems: 'center' },
    status: { width: '100%', gap: spacing.lg, marginTop: spacing.xxxl },
    iconBlock: {
        width: 96,
        height: 96,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.xl,
    },
    message: {
        textAlign: 'center',
    },
})
