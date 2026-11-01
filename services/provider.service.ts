import { CoverageSearchParams, CreateProvider } from "../types/provider.types"
import api from "./api"


export const getServiceProviders = async (serviceId: string, page?: number, limit?: number) => {   
    const response = await api.get(`/providers/service/${serviceId}/providers`,
        {
            params: {
                page: page || 1,
                limit: limit || 10
            }
        }
    )
    return response.data
}

export const getProviderServiceById = async (providerServiceId: string) => {
    const response = await api.get(`/providers/${providerServiceId}`)
    return response.data
}

export const getPublicProfile = async (providerServiceId: string) => {
    const response = await api.get(`/providers/${providerServiceId}/profile`)
    return response.data
}

export const getProviderServices = async (page?: number, limit?: number) => {
    const response = await api.get(`/providers`,
        {
            params: {
                page: page || 1,
                limit: limit || 10
            }
        }
    )
    return response.data
}

export const createProviderService = async (serviceId: string, price: number) => {
    const response = await api.post(`/providers`, {
        service_id: serviceId,
        price: price
    })
    return response.data
}

export const updateProviderService = async (providerServiceId: string, price: number) => {
    const response = await api.patch(`/providers/${providerServiceId}`, {
        price: price
    })
    return response.data
}

export const deleteProviderService = async (providerServiceId: string) => {
    const response = await api.delete(`/providers/${providerServiceId}`)
    return response.data
}

export const registerAsProvider = async (providerData: CreateProvider) => {
    const response = await api.post(`/providers/register`, providerData)
    return response.data
}

export const getProviderEarnings = async () => {
    const response = await api.get(`/providers/earnings`)
    return response.data
}

export const searchCoverage = async (params: CoverageSearchParams) => {
    const response = await api.get('/providers/coverage', {
        params: {
            address: params.address,
            service_id: params.service_id,
            category_id: params.category_id,
            ...(params.latitude != null && params.longitude != null
                ? { latitude: params.latitude, longitude: params.longitude }
                : {}),
        },
    })
    return response.data
}

export const getProviderMenu = async () => {
    const response = await api.get('/providers/menu')
    return response.data
}

export const saveProviderMenu = async (offers: unknown[]) => {
    const response = await api.put('/providers/menu', { offers })
    return response.data
}

export const getServiceLocation = async () => {
    const response = await api.get('/providers/service-location')
    return response.data
}

export const getMapTiles = async () => {
    const response = await api.get('/providers/service-location/map-tiles')
    return response.data as { data: { url: string } }
}

export type AddressSuggestion = {
    label: string
    address: string
    postal_code: string | null
    latitude: number
    longitude: number
}

export const autocompleteServiceLocation = async (text: string) => {
    const response = await api.get('/providers/service-location/autocomplete', { params: { text } })
    return response.data as { data: AddressSuggestion[] }
}

export const lookupServicePostalCode = async (postalCode: string) => {
    const response = await api.get('/providers/service-location/postal-code', {
        params: { postal_code: postalCode },
    })
    return response.data as { data: { postal_code: string, address: string } }
}

export const previewServiceLocation = async (address: string, postalCode: string) => {
    const response = await api.get('/providers/service-location/preview', {
        params: { address, postal_code: postalCode },
    })
    return response.data
}

export const getWeeklyAvailability = async () => {
    const response = await api.get('/providers/weekly-availability')
    return response.data
}

export const saveWeeklyAvailability = async (routine: unknown) => {
    const response = await api.put('/providers/weekly-availability', routine)
    return response.data
}

export const getWeeklySlots = async (date: string, durationMinutes: number) => {
    const response = await api.get('/providers/weekly-availability/slots', {
        params: { date, duration_minutes: durationMinutes },
    })
    return response.data as { data: { slots: string[] } }
}

export const addManualAppointment = async (appointment: { starts_at: string, ends_at: string }) => {
    const response = await api.post('/providers/weekly-availability/appointments', appointment)
    return response.data
}

export const saveServiceLocation = async (location: {
    address: string
    postal_code: string | null
    complement: string | null
    radius_km: number
    travel_fee_mode: string
    travel_fee_per_km: number | null
    latitude?: number
    longitude?: number
}) => {
    const response = await api.put('/providers/service-location', location)
    return response.data
}
