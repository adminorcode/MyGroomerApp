import { z } from 'zod'

const speciesValues = ['dog', 'cat', 'other'] as const
const sizeValues = ['small', 'medium', 'large'] as const

export const petFormSchema = z.object({
    name: z.string().trim().min(1, 'Informe o nome do pet').max(60, 'O nome deve ter no máximo 60 caracteres'),
    species: z.string().refine(
        (value): value is typeof speciesValues[number] => speciesValues.some((item) => item === value),
        'Informe a espécie',
    ),
    breed: z.string().trim().min(1, 'Informe a raça').max(80, 'A raça deve ter no máximo 80 caracteres'),
    size: z.string().refine(
        (value): value is typeof sizeValues[number] => sizeValues.some((item) => item === value),
        'Informe o porte',
    ),
    age_years: z.string().superRefine((value, ctx) => {
        const trimmed = value.trim()
        if (!trimmed) {
            ctx.addIssue({ code: 'custom', message: 'Informe a idade em anos' })
            return
        }
        if (/^-\d+$/.test(trimmed)) {
            ctx.addIssue({ code: 'custom', message: 'A idade não pode ser negativa' })
            return
        }
        if (!/^\d+$/.test(trimmed)) {
            ctx.addIssue({ code: 'custom', message: 'Informe a idade em anos' })
            return
        }
        if (Number(trimmed) > 40) {
            ctx.addIssue({ code: 'custom', message: 'Informe uma idade de até 40 anos' })
        }
    }),
    notes: z.string().trim().max(500, 'As observações devem ter no máximo 500 caracteres'),
})

export type PetFormValues = z.output<typeof petFormSchema>
export type PetFormInput = z.input<typeof petFormSchema>
