import api from './api'

export const addFavoriteProvider = async (providerId: string) => {
    const response = await api.post('/customer-favorites', { provider_id: providerId })
    return response.data as { success: boolean, data: { provider_id: string, is_favorite: boolean } }
}

export const removeFavoriteProvider = async (providerId: string) => {
    const response = await api.delete(`/customer-favorites/${providerId}`)
    return response.data as { success: boolean, data: { provider_id: string, is_favorite: boolean } }
}
