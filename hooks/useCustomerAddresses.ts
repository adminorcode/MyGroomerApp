import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    createCustomerAddress,
    deleteCustomerAddress,
    listCustomerAddresses,
    SaveCustomerAddress,
    updateCustomerAddress,
} from '../services/customerAddress.service'

export const useCustomerAddresses = () => {
    return useQuery({
        queryKey: ['customer-addresses'],
        queryFn: listCustomerAddresses,
        select: data => data.data,
        retry: false,
    })
}

export const useSaveCustomerAddress = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, body }: { id?: string, body: SaveCustomerAddress }) =>
            id ? updateCustomerAddress(id, body) : createCustomerAddress(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-addresses'] })
        },
    })
}

export const useDeleteCustomerAddress = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, replacementId }: { id: string, replacementId?: string }) =>
            deleteCustomerAddress(id, replacementId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-addresses'] })
        },
    })
}
