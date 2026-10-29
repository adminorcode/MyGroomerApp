import { useEffect, useRef } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { useTheme } from '../../context/ThemeContext'
import { spacing } from '../../constants/theme'
import { MGEmptyState, MGErrorState, MGText } from '../../design-system/components'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../../navigation/types'
import { useVerifyEmailMutation } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/error'

type Props = {
    navigation: StackNavigationProp<AuthStackParamList, 'VerifyEmail'>
}

export default function VerifyEmailScreen({ navigation }: Props) {
  console.log("VerifyEmailScreen mounted")
    const route = useRoute()
    const { mutate, isPending, isSuccess, isError, error } = useVerifyEmailMutation()
    const { colors } = useTheme();
    
    const params = route.params as { token?: string }
    const hasMutated = useRef(false)
    useEffect(() => {
        // extract token from deep link params
        console.log("Verify screen params:", params)
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


    if (isPending) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <MGText color="secondary" style={styles.message}>Verificando seu e-mail...</MGText>
            </View>
        )
    }

    if (isSuccess) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background}]}>
                <MGEmptyState
                    title="E-mail verificado!"
                    description="Sua conta está pronta. Você já pode entrar."
                />
            </View>
        )
    }

    if (isError) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <MGErrorState
                    message={error ? getErrorMessage(error) : 'O link pode ter expirado.'}
                    onRetry={() => navigation.navigate('Login')}
                    retryLabel="Voltar ao login"
                />
            </View>
        )
    }

    // no token in URL
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <MGEmptyState
                title="Confira seu e-mail"
                description="Enviamos um link de verificação para o seu e-mail. Toque nele para confirmar a conta."
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    message: {
        textAlign: 'center',
    },
})
