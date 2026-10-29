import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPet, findPet, listPets, SavePetBody, updatePet } from '../services/pet.service'

export const usePets = () => {
    return useQuery({
        queryKey: ['pets'],
        queryFn: listPets,
        select: (data) => data.data,
        retry: false,
    })
}

export const usePet = (petId?: string) => {
    return useQuery({
        queryKey: ['pets', petId],
        queryFn: () => findPet(petId as string),
        select: (data) => data.data,
        enabled: !!petId,
        retry: false,
    })
}

export const useCreatePet = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (pet: SavePetBody) => createPet(pet),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pets'] })
        },
    })
}

export const useUpdatePet = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ petId, pet }: { petId: string, pet: SavePetBody }) => updatePet(petId, pet),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pets'] })
        },
    })
}
