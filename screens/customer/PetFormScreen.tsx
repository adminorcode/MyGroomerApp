import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
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
import { PetPhotoBody, toPetBody } from '../../services/pet.service'
import { pickPublicPhoto } from '../provider/publicProfilePhoto'
import { useRuntime } from '../../context/RuntimeContext'
import { useAuthorizedImage } from '../../hooks/useAuthorizedImage'
import { editWeightKg, formatWeightKg } from '../../utils/weight'
import { petFormSchema, PetFormInput, PetFormValues } from '../../validators/pet.validator'
import { PET_SIZES, PET_SPECIES, PetSize, PetSpecies } from '../../types/pet.types'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGChip, MGErrorState, MGText, MGTextField } from '../../design-system/components'
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
    weight_kg: '',
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
    const runtime = useRuntime()
    const photoRequired = runtime.petPhotoRequired
    const providerServiceId = params.providerServiceId
    const { colors } = useMGTheme()
    const existing = usePet(petId)
    const { mutateAsync: createPet, isPending: isCreating } = useCreatePet()
    const { mutateAsync: updatePet, isPending: isUpdating } = useUpdatePet()
    const isPending = isCreating || isUpdating
    const [photo, setPhoto] = useState<PetPhotoBody | null>(null)
    const [photoError, setPhotoError] = useState<string | null>(null)
    const storedPhoto = useAuthorizedImage(existing.data?.photo_id ? `/pets/${existing.data.id}/photo?v=${existing.data.photo_id}` : null)
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
            weight_kg: formatWeightKg(existing.data.weight_kg),
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

    const pickPhoto = async () => {
        try {
            const picked = await pickPublicPhoto()
            if (!picked) return
            setPhoto(picked)
            setPhotoError(null)
        } catch (error) {
            setPhotoError(getErrorMessage(error))
        }
    }

    const onSubmit = async (values: PetFormValues) => {
        const keptPhoto = Boolean(photo || existing.data?.has_photo || existing.data?.photo_url)
        if (photoRequired && !keptPhoto) {
            setPhotoError('Informe a foto do pet')
            return
        }
        try {
            const body = toPetBody(values, photo)
            const saved = petId
                ? await updatePet({ petId, pet: body })
                : await createPet(body)
            const savedId = saved.data.id
            if (providerServiceId) {
                ;(navigation as StackNavigationProp<HomeStackParamList, 'PetForm'>).navigate('BookService', {
                    providerServiceId,
                    petId: savedId,
                    petStamp: Date.now(),
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
                    if (issue.field === 'photo' || String(issue.field).startsWith('photo.')) {
                        setPhotoError(issue.message)
                        continue
                    }
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
                <View style={[styles.photo, { backgroundColor: colors.surface.pinkSubtle, borderColor: photoError ? colors.feedback.error : colors.border.default }]}>
                    {photo ? (
                        <Image accessibilityLabel="Foto selecionada" source={{ uri: `data:${photo.mime_type};base64,${photo.base64}` }} style={styles.photoImage} />
                    ) : storedPhoto || existing.data?.photo_url ? (
                        <Image accessibilityLabel="Foto atual" source={{ uri: storedPhoto ?? existing.data?.photo_url ?? undefined }} style={styles.photoImage} />
                    ) : (
                        <MGArtwork name="pet-placeholder" width={52} height={52} />
                    )}
                </View>
                <MGText variant="bodySmall" color="secondary" style={styles.photoNote}>
                    {photoRequired
                        ? 'A foto é obrigatória. Selecione um JPG ou PNG.'
                        : 'A foto é opcional neste ambiente de desenvolvimento.'}
                </MGText>
                {photo ? <MGText variant="caption" style={styles.photoNote}>{photo.name}</MGText> : null}
                <MGButton
                    label={photo || storedPhoto || existing.data?.photo_url ? 'Trocar foto' : 'Adicionar foto'}
                    variant="secondary"
                    onPress={() => { void pickPhoto() }}
                />
                {photoError ? (
                    <MGText variant="caption" color="error" accessibilityRole="alert" style={styles.photoNote}>{photoError}</MGText>
                ) : null}
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
                    name="weight_kg"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <WeightField value={value} onChange={onChange} onBlur={onBlur} error={errors.weight_kg?.message} />
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
                    onPress={() => {
                        const keptPhoto = Boolean(photo || existing.data?.has_photo || existing.data?.photo_url)
                        if (photoRequired && !keptPhoto) setPhotoError('Informe a foto do pet')
                        void handleSubmit(onSubmit)()
                    }}
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

function WeightField({ value, onChange, onBlur, error }: { value: string, onChange: (value: string) => void, onBlur: () => void, error?: string }) {
    const [selection, setSelection] = useState<{ start: number, end: number }>()
    const lastKey = useRef('')
    return (
        <MGTextField
            label="Peso (kg)"
            accessibilityLabel="Peso (kg)"
            placeholder="0,0"
            value={value}
            keyboardType="decimal-pad"
            autoCorrect={false}
            selection={selection}
            onKeyPress={event => { lastKey.current = event.nativeEvent.key }}
            onSelectionChange={event => setSelection(event.nativeEvent.selection)}
            onChangeText={next => {
                const edited = editWeightKg(value ?? '', next, lastKey.current === 'Delete')
                lastKey.current = ''
                onChange(edited.value)
                setSelection({ start: edited.caret, end: edited.caret })
            }}
            onBlur={onBlur}
            error={error}
        />
    )
}

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
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { value, onChange } }) => (
                <View style={styles.choiceGroup}>
                    <MGText variant="label" style={styles.choiceLabel}>{label}</MGText>
                    <View style={styles.choices}>
                        {options.map((option) => (
                            <View key={option.value} style={styles.choiceSlot}>
                                <MGChip
                                    fill
                                    accessibilityRole="radio"
                                    label={option.label}
                                    accessibilityLabel={option.label}
                                    selected={value === option.value}
                                    invalid={Boolean(error)}
                                    onPress={() => onChange(option.value)}
                                />
                            </View>
                        ))}
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
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    photoImage: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
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
    choiceSlot: {
        flexGrow: 1,
        flexBasis: 0,
    },
    choiceError: {
        marginTop: spacing.xs,
    },
})
