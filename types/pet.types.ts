export const PET_SPECIES = [
    { value: 'dog', label: 'Cão' },
    { value: 'cat', label: 'Gato' },
    { value: 'other', label: 'Outro' },
] as const

export const PET_SIZES = [
    { value: 'small', label: 'Pequeno' },
    { value: 'medium', label: 'Médio' },
    { value: 'large', label: 'Grande' },
] as const

export type PetSpecies = typeof PET_SPECIES[number]['value']
export type PetSize = typeof PET_SIZES[number]['value']

export type Pet = {
    id: string
    owner_id: string
    name: string
    species: PetSpecies
    breed: string
    size: PetSize
    age_years: number
    notes: string | null
    photo_url: string | null
}

export function petSpeciesLabel(species: string) {
    return PET_SPECIES.find((item) => item.value === species)?.label ?? species
}

export function petSizeLabel(size: string) {
    return PET_SIZES.find((item) => item.value === size)?.label ?? size
}
