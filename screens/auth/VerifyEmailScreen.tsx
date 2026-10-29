import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { useTheme } from '../../context/ThemeContext'
import { fonts, typography, spacing } from '../../constants/theme'
import BoameBtn from '../../components/shared/BoameBtn'
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
                <Text style={[styles.message, {color:colors.textSecondary}]}>Verificando seu e-mail...</Text>
            </View>
        )
    }

    if (isSuccess) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background}]}>
                <Text style={[styles.title, {color:colors.text}]}>E-mail verificado!</Text>
                <Text style={[styles.message, {color:colors.textSecondary}]}>Sua conta está pronta. Você já pode entrar.</Text>
                {/* <BoameBtn
                    title="Go to Login"
                    onPress={() => navigation.navigate('Login')}
                /> */}
            </View>
        )
    }

    if (isError) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, {color:colors.text}]}>Falha na verificação</Text>
                <Text style={[styles.message, {color:colors.textSecondary}]}>{error ? getErrorMessage(error) : 'O link pode ter expirado.'}</Text>
                <BoameBtn
                    title="Voltar ao login"
                    onPress={() => navigation.navigate('Login')}
                />
            </View>
        )
    }

    // no token in URL
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.primary }]}>Confira seu e-mail</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
                Enviamos um link de verificação para o seu e-mail. Toque nele para confirmar a conta.
            </Text>
            {/* <BoameBtn
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
            /> */}
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
    title: {
        fontSize: typography.sizes.xl,
        fontFamily: fonts.logo,
        textAlign: 'center',
    },
    message: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
        textAlign: 'center',
    },
})