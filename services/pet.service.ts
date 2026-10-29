import { Pet } from '../types/pet.types'
import { PetFormValues } from '../validators/pet.validator'
import api from './api'

export type SavePetBody = {
    name: string
    species: Pet['species']
    breed: string
    size: Pet['size']
    age_years: number
    notes: string | null
}

export const toPetBody = (values: PetFormValues): SavePetBody => ({
    name: values.name.trim(),
    species: values.species,
    breed: values.breed.trim(),
    size: values.size,
    age_years: Number(values.age_years),
    notes: values.notes.trim() || null,
})

export const listPets = async () => {
    const response = await api.get('/pets')
    return response.data as { success: boolean, data: Pet[] }
}

export const findPet = async (petId: string) => {
    const response = await api.get(`/pets/${petId}`)
    return response.data as { success: boolean, data: Pet }
}

export const createPet = async (pet: SavePetBody) => {
    const response = await api.post('/pets', pet)
    return response.data as { success: boolean, data: Pet }
}

export const updatePet = async (petId: string, pet: SavePetBody) => {
    const response = await api.patch(`/pets/${petId}`, pet)
    return response.data as { success: boolean, data: Pet }
}
