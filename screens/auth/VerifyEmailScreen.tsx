import { useEffect, useRef } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { useTheme } from '../../context/ThemeContext'
import { spacing } from '../../constants/theme'
import { MGErrorState, MGScreen, MGText } from '../../design-system/components'
import MGBrand from '../../design-system/components/MGBrand'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../../navigation/types'
import { useVerifyEmailMutation } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/error'

type Props = {
    navigation: StackNavigationProp<AuthStackParamList, 'VerifyEmail'>
}

export default function VerifyEmailScreen({ navigation }: Props) {
    const route = useRoute()
    const { mutate, isPending, isSuccess, isError, error } = useVerifyEmailMutation()
    const { colors } = useTheme();
    
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
                        <ActivityIndicator accessibilityLabel="Verificando e-mail" color={colors.primary} />
                        <MGText color="secondary" style={styles.message}>Verificando seu e-mail...</MGText>
                    </> : isError ? <MGErrorState
                        message={error ? getErrorMessage(error) : 'O link pode ter expirado.'}
                        onRetry={() => navigation.navigate('Login')}
                        retryLabel="Voltar ao login"
                    /> : <>
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
    message: {
        textAlign: 'center',
    },
})
