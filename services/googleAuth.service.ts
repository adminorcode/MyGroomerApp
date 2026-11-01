import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { API_BASE_URL } from '../constants/api'
import { appDeepLink } from '../constants/brand'

const GOOGLE_REDIRECT_URI = appDeepLink('auth/callback')

export async function signInWithGoogle(): Promise<string> {
    const authUrl = `${API_BASE_URL.replace(/\/$/, '')}/auth/google`
    
    const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_REDIRECT_URI)

    if (result.type !== 'success' || !result.url) {
        throw new Error('O login com Google foi cancelado ou falhou')
    }

    const { queryParams } = Linking.parse(result.url)
    const token = queryParams?.token

    if (typeof token !== 'string' || !token) {
        throw new Error('Nenhum token foi recebido')
    }

    return token
}
