import { Pet } from '../types/pet.types'

export function petUseBlock(pet: Pet, photoRequired: boolean): string | null {
    if (pet.weight_kg == null || !(pet.weight_kg > 0)) return 'Informe o peso para usar este pet.'
    if (photoRequired && !(pet.has_photo || pet.photo_url?.trim())) return 'Informe a foto para usar este pet.'
    return null
}
