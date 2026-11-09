import { useEffect } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import axios from 'axios'
import MGArtwork from '../../design-system/components/MGArtwork'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { AppAlert } from '../../utils/alert'
import { HomeStackParamList, ProfileStackParamList } from '../../navigation/types'
import { useCreatePet, usePet, useUpdatePet } from '../../hooks/usePets'
import { toPetBody } from '../../services/pet.service'
import { petFormSchema, PetFormInput, PetFormValues } from '../../validators/pet.validator'
import { PET_SIZES, PET_SPECIES, PetSize, PetSpecies } from '../../types/pet.types'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGChip, MGErrorState, MGIcon, MGText, MGTextField } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { spacing } from '../../constants/theme'
import { getErrorMessage } from '../../utils/error'

type PetFormParams = {
    petId?: string
    providerServiceId?: string
    customerLocation?: string
    customerLatitude?: number
    customerLongitude?: number
}

type Props = {
    navigation: StackNavigationProp<HomeStackParamList, 'PetForm'> | StackNavigationProp<ProfileStackParamList, 'PetForm'>
    route: RouteProp<HomeStackParamList, 'PetForm'> | RouteProp<ProfileStackParamList, 'PetForm'>
}

const emptyValues: PetFormInput = {
    name: '',
    species: '',
    breed: '',
    size: '',
    age_years: '',
    notes: '',
    allergies: '',
    medications: '',
    health_conditions: '',
    behavior: '',
    special_care: '',
    vaccination: 'unknown',
}

export default function PetFormScreen({ navigation, route }: Props) {
    const params = (route.params ?? {}) as PetFormParams
    const petId = params.petId
    const providerServiceId = params.providerServiceId
    const { colors } = useMGTheme()
    const existing = usePet(petId)
    const { mutateAsync: createPet, isPending: isCreating } = useCreatePet()
    const { mutateAsync: updatePet, isPending: isUpdating } = useUpdatePet()
    const isPending = isCreating || isUpdating
    const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<PetFormInput, unknown, PetFormValues>({
        resolver: zodResolver(petFormSchema),
        defaultValues: emptyValues,
    })

    useEffect(() => {
        if (!existing.data) return
        reset({
            name: existing.data.name,
            species: existing.data.species,
            breed: existing.data.breed,
            size: existing.data.size,
            age_years: String(existing.data.age_years),
            notes: existing.data.notes ?? '',
            allergies: existing.data.allergies ?? '',
            medications: existing.data.medications ?? '',
            health_conditions: existing.data.health_conditions ?? '',
            behavior: existing.data.behavior ?? '',
            special_care: existing.data.special_care ?? '',
            vaccination: existing.data.vaccination_up_to_date === true
                ? 'yes'
                : existing.data.vaccination_up_to_date === false
                    ? 'no'
                    : 'unknown',
        })
    }, [existing.data, reset])

    const onSubmit = async (values: PetFormValues) => {
        try {
            const body = toPetBody(values)
            const saved = petId
                ? await updatePet({ petId, pet: body })
                : await createPet(body)
            const savedId = saved.data.id
            if (providerServiceId) {
                ;(navigation as StackNavigationProp<HomeStackParamList, 'PetForm'>).navigate('BookService', {
                    providerServiceId,
                    petId: savedId,
                    customerLocation: params.customerLocation,
                    customerLatitude: params.customerLatitude,
                    customerLongitude: params.customerLongitude,
                })
                return
            }
            navigation.goBack()
        } catch (error) {
            if (axios.isAxiosError(error) && Array.isArray(error.response?.data?.errors)) {
                for (const issue of error.response.data.errors) {
                    if (issue.field) setError(issue.field as keyof PetFormValues, { message: issue.message })
                }
                return
            }
            AppAlert.alert('Não foi possível salvar o pet', getErrorMessage(error))
        }
    }

    if (petId && existing.isLoading) {
        return (
            <ScreenContainer>
                <ScreenHeader title="Editar pet" showBackButton onBack={() => navigation.goBack()} />
                <View style={styles.centered}>
                    <ActivityIndicator accessibilityLabel="Carregando pet" size="large" color={colors.action.primary} />
                    <MGText>Carregando pet</MGText>
                </View>
            </ScreenContainer>
        )
    }

    if (petId && (existing.isError || !existing.data)) {
        return (
            <ScreenContainer>
                <ScreenHeader title="Editar pet" showBackButton onBack={() => navigation.goBack()} />
                <MGErrorState message="Não foi possível carregar este pet." onRetry={() => { void existing.refetch() }} />
            </ScreenContainer>
        )
    }

    return (
        <ScreenContainer>
            <KeyboardAwareScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scroll}
                enableOnAndroid
            >
                <ScreenHeader
                    title={petId ? 'Editar pet' : 'Cadastrar pet'}
                    description="Esses dados voltam no próximo agendamento"
                    showBackButton
                    onBack={() => navigation.goBack()}
                />
                <View style={[styles.photo, { backgroundColor: colors.surface.pinkSubtle }]}>
                    <MGArtwork name="pet-placeholder" width={52} height={52} />
                </View>
                <MGText variant="bodySmall" color="secondary" style={styles.photoNote}>
                    A foto é opcional. O pet pode ser salvo sem ela.
                </MGText>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
                            label="Nome"
                            accessibilityLabel="Nome"
                            placeholder="Nome do pet"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="words"
                            error={errors.name?.message}
                        />
                    )}
                />
                <ChoiceField
                    label="Espécie"
                    options={PET_SPECIES}
                    error={errors.species?.message}
                    control={control}
                    name="species"
                />
                <Controller
                    control={control}
                    name="breed"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
                            label="Raça"
                            accessibilityLabel="Raça"
                            placeholder="Raça ou SRD"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.breed?.message}
                        />
                    )}
                />
                <ChoiceField
                    label="Porte"
                    options={PET_SIZES}
                    error={errors.size?.message}
                    control={control}
                    name="size"
                />
                <Controller
                    control={control}
                    name="age_years"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
                            label="Idade (anos)"
                            accessibilityLabel="Idade (anos)"
                            placeholder="0"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="number-pad"
                            error={errors.age_years?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
                            label="Observações"
                            accessibilityLabel="Observações"
                            placeholder="Comportamento, saúde ou cuidados"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            multiline
                            error={errors.notes?.message}
                        />
                    )}
                />
                <HealthSection control={control} errors={errors} />
                <MGButton
                    label={petId ? 'Salvar' : 'Salvar e continuar'}
                    loading={isPending}
                    onPress={handleSubmit(onSubmit)}
                />
            </KeyboardAwareScrollView>
        </ScreenContainer>
    )
}

const HEALTH_FIELDS = [
    { name: 'allergies', label: 'Alergias' },
    { name: 'medications', label: 'Medicamentos em uso' },
    { name: 'health_conditions', label: 'Condições de saúde' },
    { name: 'behavior', label: 'Comportamento' },
    { name: 'special_care', label: 'Cuidados especiais' },
] as const

const VACCINATION = [
    { value: 'yes', label: 'Em dia' },
    { value: 'no', label: 'Não está em dia' },
    { value: 'unknown', label: 'Não informado' },
] as const

function HealthSection({
    control,
    errors,
}: {
    control: ReturnType<typeof useForm<PetFormInput, unknown, PetFormValues>>['control']
    errors: Partial<Record<'allergies' | 'medications' | 'health_conditions' | 'behavior' | 'special_care', { message?: string }>>
}) {
    const { spacing } = useMGTheme()
    return (
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <MGText variant="title">Saúde e cuidados</MGText>
            {HEALTH_FIELDS.map(field => (
                <Controller
                    key={field.name}
                    control={control}
                    name={field.name}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <MGTextField
                            label={field.label}
                            accessibilityLabel={field.label}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            multiline
                            error={errors[field.name]?.message}
                        />
                    )}
                />
            ))}
            <Controller
                control={control}
                name="vaccination"
                render={({ field: { value, onChange } }) => (
                    <View style={{ gap: spacing.sm, marginBottom: spacing.base }}>
                        <MGText variant="label">Vacinação em dia</MGText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                            {VACCINATION.map(option => (
                                <MGChip
                                    key={option.value}
                                    label={option.label}
                                    accessibilityLabel={option.label}
                                    selected={value === option.value}
                                    minHeight={52}
                                    onPress={() => onChange(option.value)}
                                />
                            ))}
                        </View>
                    </View>
                )}
            />
        </View>
    )
}

type ChoiceOption = { value: PetSpecies | PetSize, label: string }

function ChoiceField({
    label,
    options,
    error,
    control,
    name,
}: {
    label: string
    options: readonly ChoiceOption[]
    error?: string
    control: ReturnType<typeof useForm<PetFormInput, unknown, PetFormValues>>['control']
    name: 'species' | 'size'
}) {
    const { colors, radius } = useMGTheme()
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { value, onChange } }) => (
                <View style={styles.choiceGroup}>
                    <MGText variant="label" style={styles.choiceLabel}>{label}</MGText>
                    <View style={styles.choices}>
                        {options.map((option) => {
                            const selected = value === option.value
                            // CMP-06 / R1: selecionado = action.primary com texto branco; não selecionado = contorno rosa.
                            return (
                                <Pressable
                                    key={option.value}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected, checked: selected }}
                                    aria-checked={selected}
                                    accessibilityLabel={option.label}
                                    onPress={() => onChange(option.value)}
                                    style={[
                                        styles.choice,
                                        {
                                            borderRadius: radius.pill,
                                            backgroundColor: selected ? colors.action.primary : colors.surface.default,
                                            borderColor: error ? colors.feedback.error : colors.action.primaryOutline,
                                        },
                                    ]}
                                >
                                    {selected && <MGIcon name="check" size={14} color={colors.onAction.primary} />}
                                    <MGText variant="label" color={selected ? 'inverse' : 'primary'}>{option.label}</MGText>
                                </Pressable>
                            )
                        })}
                    </View>
                    {!!error && <MGText variant="caption" color="error" style={styles.choiceError}>{error}</MGText>}
                </View>
            )}
        />
    )
}

const PHOTO_SIZE = 96

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: spacing.xl,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    photo: {
        // CMP-12: placeholder circular — largura = altura e raio = metade do lado.
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    photoNote: {
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
    },
    choiceGroup: {
        marginBottom: spacing.base,
    },
    choiceLabel: {
        marginBottom: spacing.sm,
    },
    choices: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    choice: {
        flexGrow: 1,
        justifyContent: 'center',
        minHeight: 52,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    choiceError: {
        marginTop: spacing.xs,
    },
})
