import { useEffect } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import axios from 'axios'
import { Check, PawPrint } from 'lucide-react-native'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { AppAlert } from '../../utils/alert'
import { HomeStackParamList, ProfileStackParamList } from '../../navigation/types'
import { useCreatePet, usePet, useUpdatePet } from '../../hooks/usePets'
import { toPetBody } from '../../services/pet.service'
import { petFormSchema, PetFormInput, PetFormValues } from '../../validators/pet.validator'
import { PET_SIZES, PET_SPECIES, PetSize, PetSpecies } from '../../types/pet.types'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import BoameInput from '../../components/shared/Input'
import BoameBtn from '../../components/shared/BoameBtn'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { getErrorMessage } from '../../utils/error'

type PetFormParams = { petId?: string, providerServiceId?: string }

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
}

export default function PetFormScreen({ navigation, route }: Props) {
    const params = (route.params ?? {}) as PetFormParams
    const petId = params.petId
    const providerServiceId = params.providerServiceId
    const { colors } = useTheme()
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
                <View style={styles.centered}>
                    <ActivityIndicator accessibilityLabel="Carregando pet" size="large" color={colors.primary} />
                </View>
            </ScreenContainer>
        )
    }

    if (petId && (existing.isError || !existing.data)) {
        return (
            <ScreenContainer>
                <ScreenHeader title="Editar pet" showBackButton onBack={() => navigation.goBack()} />
                <Text style={[styles.message, { color: colors.error }]}>Não foi possível carregar este pet.</Text>
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
                <View style={[styles.photo, { backgroundColor: colors.selectionSoft }]}>
                    <PawPrint color={colors.primary} size={28} />
                </View>
                <Text style={[styles.photoNote, { color: colors.textSecondary }]}>
                    A foto é opcional. O pet pode ser salvo sem ela.
                </Text>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <BoameInput
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
                        <BoameInput
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
                        <BoameInput
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
                        <BoameInput
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
                <BoameBtn
                    title={petId ? 'Salvar' : 'Salvar e continuar'}
                    loading={isPending}
                    onPress={handleSubmit(onSubmit)}
                />
            </KeyboardAwareScrollView>
        </ScreenContainer>
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
    const { colors } = useTheme()
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { value, onChange } }) => (
                <View style={styles.choiceGroup}>
                    <Text style={[styles.choiceLabel, { color: colors.text }]}>{label}</Text>
                    <View style={styles.choices}>
                        {options.map((option) => {
                            const selected = value === option.value
                            return (
                                <Pressable
                                    key={option.value}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected }}
                                    accessibilityLabel={option.label}
                                    onPress={() => onChange(option.value)}
                                    style={[
                                        styles.choice,
                                        {
                                            backgroundColor: selected ? colors.selectionSoft : colors.background,
                                            borderColor: error ? colors.error : selected ? colors.primary : colors.border,
                                        },
                                    ]}
                                >
                                    {selected && <Check size={16} color={colors.primary} />}
                                    <Text style={[styles.choiceText, { color: colors.text }]}>{option.label}</Text>
                                </Pressable>
                            )
                        })}
                    </View>
                    {!!error && <Text style={[styles.choiceError, { color: colors.error }]}>{error}</Text>}
                </View>
            )}
        />
    )
}

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: spacing.xl,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    message: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
    },
    photo: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    photoNote: {
        textAlign: 'center',
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
    },
    choiceGroup: {
        marginBottom: spacing.base,
    },
    choiceLabel: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.semibold,
        marginBottom: spacing.sm,
    },
    choices: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    choice: {
        minHeight: 52,
        borderWidth: 2,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    choiceText: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
    },
    choiceError: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.xs,
    },
})
