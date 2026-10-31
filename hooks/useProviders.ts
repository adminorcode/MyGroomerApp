import { addManualAppointment, createProviderService, deleteProviderService, getProviderEarnings, getProviderMenu, getProviderServiceById, getProviderServices, getPublicProfile, getServiceLocation, getServiceProviders, getWeeklyAvailability, getWeeklySlots, previewServiceLocation, registerAsProvider, saveProviderMenu, saveServiceLocation, saveWeeklyAvailability, searchCoverage, updateProviderService } from "../services/provider.service"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "../store/authStore"
import { CreateProvider, ProviderServiceDetailed, CoverageProvider, CoverageSearchParams, PublicProfile } from "../types/provider.types"
import { ServiceMenu } from "../screens/provider/serviceMenuModel"
import { LocatedPoint, ServiceLocation } from "../screens/provider/serviceLocationModel"
import { WeeklyRoutine } from "../screens/provider/weeklyAvailabilityModel"
import { ProviderEarnings } from "../types/transaction.types"
import { parseJwtPayload } from "../utils/jwt"

export const useGetProviderMenu = () => {
    return useQuery({
        queryKey: ['provider-menu'],
        queryFn: getProviderMenu,
        select: (data) => data.data as ServiceMenu,
    })
}

export const useSaveProviderMenu = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (offers: unknown[]) => saveProviderMenu(offers),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['provider-menu'] })
            queryClient.invalidateQueries({ queryKey: ['coverage'] })
            queryClient.invalidateQueries({ queryKey: ['service-providers'] })
        },
    })
}

export const useGetServiceLocation = () => {
    return useQuery({
        queryKey: ['service-location'],
        queryFn: getServiceLocation,
        retry: false,
        select: (data) => data.data as ServiceLocation,
    })
}

export const usePreviewServiceLocation = (address: string, postalCode: string, enabled: boolean) => {
    return useQuery({
        queryKey: ['service-location-preview', address, postalCode],
        queryFn: () => previewServiceLocation(address, postalCode),
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
        select: (data) => data.data as LocatedPoint,
    })
}

export const useSaveServiceLocation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: saveServiceLocation,
        onSuccess: (response) => {
            queryClient.setQueryData(['service-location'], response)
            queryClient.invalidateQueries({ queryKey: ['coverage'] })
        },
    })
}

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

export const useGetPublicProfile = (providerServiceId: string) => {
    return useQuery({
        queryKey: ['public-profile', providerServiceId],
        queryFn: () => getPublicProfile(providerServiceId),
        select: (data) => data.data as PublicProfile,
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
export const useGetWeeklyAvailability = () => {
    return useQuery({
        queryKey: ['weekly-availability'],
        queryFn: getWeeklyAvailability,
        retry: false,
        select: (data) => data.data as WeeklyRoutine,
    })
}

export const useSaveWeeklyAvailability = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: saveWeeklyAvailability,
        onSuccess: (response) => {
            queryClient.setQueryData(['weekly-availability'], response)
            queryClient.invalidateQueries({ queryKey: ['weekly-slots'] })
        },
    })
}

export const useWeeklySlots = (date: string, enabled: boolean) => {
    return useQuery({
        queryKey: ['weekly-slots', date, 60],
        queryFn: () => getWeeklySlots(date, 60),
        enabled,
        select: (data) => data.data.slots,
    })
}

export const useAddManualAppointment = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: addManualAppointment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-slots'] })
        },
    })
}

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