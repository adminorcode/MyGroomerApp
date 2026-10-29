import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useFetchCategories } from '../../hooks/useCategory'
import { useGetAllServices } from '../../hooks/useServices'
import { useCoverageSearch } from '../../hooks/useProviders'
import { CoverageSearchParams } from '../../types/provider.types'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import BoameInput from '../../components/shared/Input'
import BoameBtn from '../../components/shared/BoameBtn'
import ListCard from '../../components/shared/ListCard'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { formatMoney } from '../../utils/formatMoney'
import { formatRating } from '../../utils/formatRating'
import { getErrorMessage } from '../../utils/error'

type Props = {
    navigation: StackNavigationProp<HomeStackParamList, 'TutorSearch'>
    route: RouteProp<HomeStackParamList, 'TutorSearch'>
}

type Draft = {
    address: string
    categoryId: string
    serviceId: string
}

type Option = { id: string, name: string }

export default function TutorSearchScreen({ navigation, route }: Props) {
    const { colors } = useTheme()
    const categories = useFetchCategories()
    const [draft, setDraft] = useState<Draft>({
        address: '',
        categoryId: route.params?.categoryId ?? '',
        serviceId: route.params?.serviceId ?? '',
    })
    const [formError, setFormError] = useState({ address: '', filter: '' })
    const [query, setQuery] = useState<CoverageSearchParams | null>(null)
    const services = useGetAllServices(draft.categoryId || undefined)
    const search = useCoverageSearch(query)

    const publish = (next: Draft) => {
        const address = next.address.trim()
        const addressError = address.length >= 3 ? '' : 'Endereço do atendimento obrigatório'
        const filterError = next.serviceId || next.categoryId ? '' : 'Selecione um serviço ou uma modalidade'
        setFormError({ address: addressError, filter: filterError })
        if (addressError || filterError) {
            setQuery(null)
            return
        }
        setQuery({
            address,
            service_id: next.serviceId || undefined,
            category_id: next.categoryId || undefined,
        })
    }

    const selectCategory = (categoryId: string) => {
        const next = {
            ...draft,
            categoryId: draft.categoryId === categoryId ? '' : categoryId,
            serviceId: '',
        }
        setDraft(next)
        if (query) publish(next)
    }

    const selectService = (serviceId: string) => {
        const next = { ...draft, serviceId: draft.serviceId === serviceId ? '' : serviceId }
        setDraft(next)
        if (query) publish(next)
    }

    const categoryOptions = (categories.data ?? []) as Option[]
    const serviceOptions = ((services.data ?? []) as Option[]).filter(item => item.id && item.name)

    return (
        <ScreenContainer>
            <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
                <ScreenHeader
                    title="Quem atende"
                    description="O raio de cada groomer decide quem aparece"
                    showBackButton
                    onBack={() => navigation.goBack()}
                />
                <BoameInput
                    label="Endereço do atendimento"
                    accessibilityLabel="Endereço do atendimento"
                    placeholder="Avenida Paulista, São Paulo"
                    value={draft.address}
                    onChangeText={(address) => {
                        setDraft(current => ({ ...current, address }))
                        setQuery(null)
                    }}
                    error={formError.address}
                    autoCapitalize="words"
                />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Neste ambiente, a busca reconhece Avenida Paulista, Jabaquara e Copacabana.
                </Text>

                <Text style={[styles.groupLabel, { color: colors.text }]}>Modalidade</Text>
                <OptionRow
                    label="Modalidade"
                    options={categoryOptions}
                    selectedId={draft.categoryId}
                    onSelect={selectCategory}
                />

                <Text style={[styles.groupLabel, { color: colors.text }]}>Serviço</Text>
                <OptionRow
                    label="Serviço"
                    options={serviceOptions}
                    selectedId={draft.serviceId}
                    onSelect={selectService}
                />
                {formError.filter ? <Text style={[styles.error, { color: colors.error }]}>{formError.filter}</Text> : null}
                {(categories.isLoading || services.isLoading) ? (
                    <Text style={[styles.message, { color: colors.textSecondary }]}>Carregando filtros</Text>
                ) : null}
                {(categories.isError || services.isError) ? (
                    <View style={styles.status}>
                        <Text style={[styles.message, { color: colors.error }]}>Não foi possível carregar os filtros.</Text>
                        <BoameBtn
                            title="Tentar novamente"
                            onPress={() => {
                                categories.refetch()
                                services.refetch()
                            }}
                            fullWidth={false}
                        />
                    </View>
                ) : null}

                <BoameBtn title="Buscar" onPress={() => publish(draft)} loading={search.isFetching && !search.data} />

                <View style={styles.results}>
                    {query === null ? (
                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            {draft.serviceId || draft.categoryId
                                ? 'Informe o endereço do atendimento para ver quem atende.'
                                : 'Informe o endereço e escolha um serviço ou uma modalidade.'}
                        </Text>
                    ) : !search.data && search.isPaused ? (
                        <View style={styles.status}>
                            <Text style={[styles.message, { color: colors.error }]}>
                                Não foi possível conectar à API. Verifique o servidor e tente novamente.
                            </Text>
                            <BoameBtn title="Tentar novamente" onPress={() => search.refetch()} fullWidth={false} />
                        </View>
                    ) : !search.data && !search.isError ? (
                        <View style={styles.status} accessibilityLabel="Buscando groomers">
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.message, { color: colors.text }]}>Buscando groomers</Text>
                        </View>
                    ) : search.isError && !search.data ? (
                        <View style={styles.status}>
                            <Text style={[styles.message, { color: colors.error }]}>{getErrorMessage(search.error)}</Text>
                            <BoameBtn title="Tentar novamente" onPress={() => search.refetch()} fullWidth={false} />
                        </View>
                    ) : search.data && search.data.providers.length === 0 ? (
                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            Nenhum groomer atende este endereço.
                        </Text>
                    ) : (
                        search.data?.providers.map(item => {
                            const rating = formatRating(item.average_rating)
                            const price = `A partir de ${formatMoney(item.price)}`
                            return (
                                <ListCard
                                    key={item.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${item.name}, avaliação ${rating}, ${price}, ${item.service_name}`}
                                    title={item.name}
                                    subtitle={`Avaliação ${rating} · ${price} · ${item.service_name}`}
                                    showChevron
                                    onPress={() => navigation.navigate('GroomerProfile', { providerServiceId: item.id })}
                                />
                            )
                        })
                    )}
                </View>
            </KeyboardAwareScrollView>
        </ScreenContainer>
    )
}

function OptionRow({ label, options, selectedId, onSelect }: {
    label: string
    options: Option[]
    selectedId: string
    onSelect: (id: string) => void
}) {
    const { colors } = useTheme()
    return (
        <ScrollView
            horizontal
            accessibilityRole="radiogroup"
            accessibilityLabel={label}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.options}
        >
            {options.map(option => {
                const selected = option.id === selectedId
                return (
                    <Pressable
                        key={option.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={selected ? `${option.name}, selecionado` : option.name}
                        onPress={() => onSelect(option.id)}
                        style={[
                            styles.option,
                            {
                                borderColor: selected ? colors.focus : colors.border,
                                backgroundColor: selected ? colors.selectionSoft : colors.surface,
                                borderWidth: selected ? 2 : 1,
                            },
                        ]}
                    >
                        {selected ? <Check size={16} color={colors.text} /> : null}
                        <Text style={[styles.optionText, { color: colors.text }]}>{option.name}</Text>
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: spacing.xl,
    },
    hint: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.sm,
        marginTop: -spacing.sm,
        marginBottom: spacing.md,
    },
    groupLabel: {
        fontFamily: fonts.semibold,
        fontSize: typography.sizes.sm,
        marginBottom: spacing.sm,
    },
    options: {
        gap: spacing.sm,
        paddingBottom: spacing.md,
    },
    option: {
        minHeight: 44,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    optionText: {
        fontFamily: fonts.medium,
        fontSize: typography.sizes.sm,
    },
    error: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.sm,
        marginBottom: spacing.md,
    },
    results: {
        marginTop: spacing.lg,
        minHeight: 120,
    },
    status: {
        alignItems: 'center',
        gap: spacing.md,
    },
    message: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md,
        textAlign: 'center',
    },
})
