import { useMutation } from "@tanstack/react-query"
import { loginUser, registerUser, verifyEmail } from "../services/auth.service"
import { useAuthStore } from "../store/authStore"
import { registerSchema } from "../validators/auth.validator"
import z from "zod"
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
    const navigation = useNavigation<StackNavigationProp<AuthStackParamList, 'Register'>>()
    return useMutation({
        mutationFn: (data: z.infer<typeof registerSchema>) => registerUser(data),
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
