import { createProviderService, deleteProviderService, getProviderEarnings, getProviderServiceById, getProviderServices, getServiceProviders, registerAsProvider, searchCoverage, updateProviderService } from "../services/provider.service"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "../store/authStore"
import { CreateProvider, ProviderServiceDetailed, CoverageProvider, CoverageSearchParams } from "../types/provider.types"
import { ProviderEarnings } from "../types/transaction.types"
import { parseJwtPayload } from "../utils/jwt"

export const useGetProviderEarnings = () => {
    return useQuery({
        queryKey: ['provider-earnings'],
        queryFn: getProviderEarnings,
        select: (data) => data.data as ProviderEarnings,
    })
}

export const useGetServiceProviders = (serviceId: string, page?: number, limit?: number) => {
    return useQuery({
        queryKey: ['service-providers', serviceId, page, limit],
        queryFn: ()=> getServiceProviders(serviceId, page, limit),
        select: (data) => data.data
    })
}

export const useGetProviderServiceById = (providerServiceId: string) => {
    return useQuery({
        queryKey: ['provider', providerServiceId],
        queryFn: ()=> getProviderServiceById(providerServiceId),
        select: (data) => data.data
    })
}

export const useGetProviderServices = ( page?: number, limit?: number) => {
    return useQuery({
        queryKey: ['provider-services', page, limit],
        queryFn: ()=> getProviderServices(page, limit),
        select: (data) => data.data as ProviderServiceDetailed[]
    })
}

export const useCreateProviderService = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({serviceId, price}: {serviceId: string, price: number}) => createProviderService(serviceId, price),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['provider-services'] })
        },
        onError: (error) => {
            console.log(error)
        }
    })
}

export const useUpdateProviderService = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({providerServiceId, price}: {providerServiceId: string, price: number}) => updateProviderService(providerServiceId, price),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['provider-services'] })
        },
        onError: (error) => {
            console.log(error)
        }
    })
}

export const useDeleteProviderService = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (providerServiceId: string) => deleteProviderService(providerServiceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['provider-services'] })
        },
        onError: (error) => {
            console.log(error)
        }
    })
}

// useProviders.ts
export const useRegisterAsProvider = () => {
    const setAuth = useAuthStore((state) => state.setAuth)
    return useMutation({
        mutationFn: (data: CreateProvider) => registerAsProvider(data),
        onSuccess: (response) => {
            const token = response.token
            const user = parseJwtPayload(token)
            setAuth(token, user)
        },
    })
}

export const useCoverageSearch = (params: CoverageSearchParams | null) => {
    return useQuery({
        queryKey: ['coverage', params],
        queryFn: () => searchCoverage(params as CoverageSearchParams),
        enabled: params !== null,
        retry: false,
        refetchOnWindowFocus: false,
        select: (data) => data.data as {
            address: string
            latitude: number
            longitude: number
            providers: CoverageProvider[]
        },
    })
}