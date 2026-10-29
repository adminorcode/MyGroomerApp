import api from "./api"
import { registerSchema, tutorRegisterSchema } from "../validators/auth.validator"
import z from "zod"
import { Role } from "../types/auth.types"

export type RegisterRequest = z.infer<typeof registerSchema> | (z.infer<typeof tutorRegisterSchema> & { role: Role.CUSTOMER })

export const loginUser = async (email:string, password:string) => {
    const response = await api.post('/auth/login', {email, password})
    return response.data
}

export const registerUser = async (data: RegisterRequest) => {
    const response = await api.post('/auth/register', data)
    return response.data
}

export const verifyEmail = async (token:string) => {
    const response = await api.patch('auth/verify-email', {token})
    return response.data
}

export type ForgotPasswordResponse = {
    success: boolean
    message: string
    reset_token?: string
}

export const forgotPassword = async (email:string): Promise<ForgotPasswordResponse> => {
    const response = await api.post('auth/forgot-password', {email})
    return response.data
}

export const resetPassword = async (token:string, password:string) => {
    const response = await api.post('auth/password-reset', {token, password})
    return response.data
}