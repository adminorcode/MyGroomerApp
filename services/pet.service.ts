import { Pet } from '../types/pet.types'
import { PetFormValues } from '../validators/pet.validator'
import { parseWeightKg } from '../utils/weight'
import api from './api'

export type PetPhotoBody = {
    name: string
    mime_type: 'image/jpeg' | 'image/png'
    size: number
    base64: string
}

export type SavePetBody = {
    name: string
    species: Pet['species']
    breed: string
    size: Pet['size']
    age_years: number
    weight_kg: number
    photo?: PetPhotoBody
    notes: string | null
    allergies: string | null
    medications: string | null
    health_conditions: string | null
    vaccination_up_to_date: boolean | null
    behavior: string | null
    special_care: string | null
}

export const toPetBody = (values: PetFormValues, photo?: PetPhotoBody | null): SavePetBody => ({
    name: values.name.trim(),
    species: values.species,
    breed: values.breed.trim(),
    size: values.size,
    age_years: Number(values.age_years),
    weight_kg: parseWeightKg(values.weight_kg) ?? 0,
    ...(photo ? { photo } : {}),
    notes: values.notes.trim() || null,
    allergies: values.allergies.trim() || null,
    medications: values.medications.trim() || null,
    health_conditions: values.health_conditions.trim() || null,
    vaccination_up_to_date: values.vaccination === 'yes' ? true : values.vaccination === 'no' ? false : null,
    behavior: values.behavior.trim() || null,
    special_care: values.special_care.trim() || null,
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
