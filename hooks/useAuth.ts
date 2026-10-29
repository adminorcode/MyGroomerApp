import { useMutation } from "@tanstack/react-query"
import { forgotPassword, loginUser, registerUser, RegisterRequest, resetPassword, verifyEmail } from "../services/auth.service"
import { useAuthStore } from "../store/authStore"
import { useNavigation } from "@react-navigation/native"
import { AuthStackParamList } from "../navigation/types"
import { StackNavigationProp } from "@react-navigation/stack"

export const useLoginMutation = () => {
    return useMutation({
        mutationFn: ({email, password}: {email: string, password: string}) => loginUser(email, password),
        onSuccess: (data) => {
            useAuthStore.getState().setAuth(data.token, data.user)
        },
        onError: (error) => {
            console.log(error)
        }
    })
}

export const useRegisterMutation = () => {
    const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
    return useMutation({
        mutationFn: (data: RegisterRequest) => registerUser(data),
        onSuccess: (data) => {
            if (data.requires_verification === false) {
                navigation.navigate('Login')
                return
            }
            navigation.navigate('VerifyEmail', { email: data.email })
        },
        onError: (error) => {
            console.log(error)
        },
    })
}

export const useForgotPasswordMutation = () => {
    const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
    return useMutation({
        mutationFn: (email: string) => forgotPassword(email),
        onSuccess: (data) => {
            if (data.reset_token) {
                navigation.navigate('ResetPassword', { token: data.reset_token })
            }
        },
    })
}

export const useResetPasswordMutation = () => {
    return useMutation({
        mutationFn: ({ token, password }: { token: string, password: string }) => resetPassword(token, password),
    })
}

export const useVerifyEmailMutation = () => {
    return useMutation({
        mutationFn: ({ token }: { token: string }) => verifyEmail(token),
        onSuccess: (data) => {
            console.log(data)
        },
        onError: (error) => {
            console.log(error)
        },
    })
}
