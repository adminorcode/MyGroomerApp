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
        },
    })
    return response.data
}
