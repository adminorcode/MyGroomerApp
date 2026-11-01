import { useEffect, useRef, useState } from 'react'
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
import { AddressSuggestion, autocompleteServiceLocation, getMapTiles } from '../../services/provider.service'
import ServiceLocationMap from '../provider/ServiceLocationMap'
import { useTheme } from '../../context/ThemeContext'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGEmptyState, MGErrorState, MGText, MGTextField } from '../../design-system/components'
import { GroomerSearchCard } from '../../design-system/patterns'
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

type PickedPoint = { latitude: number, longitude: number, label: string }

function mapLabel(point: PickedPoint) {
    return `Mapa do atendimento. ${point.label}.`
}

export default function TutorSearchScreen({ navigation, route }: Props) {
    const { colors } = useTheme()
    const theme = useMGTheme()
    const categories = useFetchCategories()
    const [draft, setDraft] = useState<Draft>({
        address: '',
        categoryId: route.params?.categoryId ?? '',
        serviceId: route.params?.serviceId ?? '',
    })
    const [formError, setFormError] = useState({ address: '', filter: '' })
    const [query, setQuery] = useState<CoverageSearchParams | null>(null)
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [suggesting, setSuggesting] = useState(false)
    const [picked, setPicked] = useState<PickedPoint | null>(null)
    const [tileUrl, setTileUrl] = useState<string | null>(null)
    const [tilesReady, setTilesReady] = useState(false)
    const services = useGetAllServices(draft.categoryId || undefined)
    const search = useCoverageSearch(query)
    const suggestTicket = useRef(0)
    const skipSuggest = useRef(false)
    const hideMenu = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        let active = true
        void getMapTiles()
            .then(result => { if (active) setTileUrl(result.data.url) })
            .catch(() => { if (active) setTileUrl(null) })
            .finally(() => { if (active) setTilesReady(true) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        const ticket = suggestTicket.current + 1
        suggestTicket.current = ticket
        if (skipSuggest.current) {
            skipSuggest.current = false
            setSuggestions([])
            setSuggesting(false)
            return
        }
        const text = draft.address.trim()
        if (text.length < 3) {
            setSuggestions([])
            setSuggesting(false)
            return
        }
        setSuggesting(true)
        const handle = setTimeout(() => {
            void autocompleteServiceLocation(text)
                .then(result => {
                    if (suggestTicket.current !== ticket) return
                    setSuggestions(result.data)
                })
                .catch(() => {
                    if (suggestTicket.current === ticket) setSuggestions([])
                })
                .finally(() => {
                    if (suggestTicket.current === ticket) setSuggesting(false)
                })
        }, 300)
        return () => clearTimeout(handle)
    }, [draft.address])

    const pickedPoint = picked && picked.label === draft.address.trim() ? picked : null

    const publish = (next: Draft) => {
        const address = next.address.trim()
        const addressError = address.length >= 3 ? '' : 'Endereço do atendimento obrigatório'
        const filterError = next.serviceId || next.categoryId ? '' : 'Selecione um serviço ou uma modalidade'
        setFormError({ address: addressError, filter: filterError })
        if (addressError || filterError) {
            setQuery(null)
            return
        }
        const point = picked && picked.label === address ? picked : null
        setQuery({
            address,
            service_id: next.serviceId || undefined,
            category_id: next.categoryId || undefined,
            ...(point ? { latitude: point.latitude, longitude: point.longitude } : {}),
        })
    }

    const changeAddress = (address: string) => {
        suggestTicket.current += 1
        setDraft(current => ({ ...current, address }))
        setPicked(null)
        setQuery(null)
        setSuggestions([])
        setFormError(current => ({ ...current, address: '' }))
    }

    const chooseSuggestion = (item: AddressSuggestion) => {
        if (hideMenu.current) clearTimeout(hideMenu.current)
        skipSuggest.current = true
        suggestTicket.current += 1
        setSuggestions([])
        setSuggesting(false)
        setDraft(current => ({ ...current, address: item.address }))
        setPicked({ latitude: item.latitude, longitude: item.longitude, label: item.address })
        setQuery(null)
        setFormError(current => ({ ...current, address: '' }))
    }

    const dismissMenu = () => {
        if (hideMenu.current) clearTimeout(hideMenu.current)
        suggestTicket.current += 1
        setSuggestions([])
        setSuggesting(false)
    }

    const closeMenuSoon = () => {
        if (hideMenu.current) clearTimeout(hideMenu.current)
        hideMenu.current = setTimeout(dismissMenu, 250)
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
    const menuOpen = suggestions.length > 0

    return (
        <ScreenContainer>
            <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
                <ScreenHeader
                    title="Quem atende"
                    description="O raio de cada groomer decide quem aparece"
                    showBackButton
                    onBack={() => navigation.goBack()}
                />
                <MGTextField
                    label="Endereço do atendimento"
                    accessibilityLabel="Endereço do atendimento"
                    placeholder="Avenida Paulista, São Paulo"
                    role="combobox"
                    aria-expanded={menuOpen}
                    accessibilityState={{ expanded: menuOpen }}
                    value={draft.address}
                    onChangeText={changeAddress}
                    onFocus={() => {
                        if (hideMenu.current) clearTimeout(hideMenu.current)
                    }}
                    onBlur={closeMenuSoon}
                    error={formError.address}
                    autoCapitalize="words"
                    maxLength={200}
                    helperText={formError.address ? undefined : 'Digite para ver sugestões'}
                    menu={suggesting && suggestions.length === 0 ? (
                        <FieldWait label="Buscando endereços" />
                    ) : menuOpen ? (
                        <View
                            style={{
                                maxHeight: 240,
                                backgroundColor: theme.colors.surface.default,
                                borderRadius: theme.radius.md,
                                borderWidth: 1,
                                borderColor: theme.colors.border.default,
                                overflow: 'hidden',
                                zIndex: 1,
                                ...theme.elevation.overlay,
                            }}
                        >
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled
                                    style={{ maxHeight: 240, backgroundColor: theme.colors.surface.default }}
                                    role={'listbox' as 'list'}
                                >
                                    {suggestions.map((item, index) => (
                                        <Pressable
                                            key={`${item.latitude}-${item.longitude}-${item.label}`}
                                            role="option"
                                            accessibilityLabel={item.label}
                                            onPressIn={() => {
                                                if (hideMenu.current) clearTimeout(hideMenu.current)
                                            }}
                                            onPress={() => chooseSuggestion(item)}
                                            style={({ pressed }) => ({
                                                minHeight: 48,
                                                justifyContent: 'center',
                                                paddingHorizontal: theme.spacing.md,
                                                paddingVertical: theme.spacing.sm,
                                                backgroundColor: pressed ? theme.colors.surface.pinkSubtle : theme.colors.surface.default,
                                                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                                                borderTopColor: theme.colors.border.default,
                                            })}
                                        >
                                            <MGText variant="body">{item.label}</MGText>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                        </View>
                    ) : null}
                />
                {pickedPoint ? (
                    <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
                        {tileUrl ? (
                            <ServiceLocationMap
                                latitude={pickedPoint.latitude}
                                longitude={pickedPoint.longitude}
                                radiusKm={null}
                                label={mapLabel(pickedPoint)}
                                tileUrl={tileUrl}
                            />
                        ) : tilesReady ? null : (
                            <FieldWait label="Localizando no mapa" />
                        )}
                        <MGText variant="body">{pickedPoint.label}</MGText>
                        {tileUrl ? (
                            <MGText variant="caption" color="secondary" style={{ fontSize: 10, lineHeight: 12 }}>
                                Powered by Geoapify · OpenStreetMap
                            </MGText>
                        ) : null}
                    </View>
                ) : (
                    <View accessible accessibilityLabel="Mapa sem ponto" style={{ marginBottom: theme.spacing.md }}>
                        <MGEmptyState
                            title="Mapa sem ponto"
                            description="Escolha um endereço sugerido para ver o ponto no mapa."
                        />
                    </View>
                )}
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
                    <MGErrorState
                        message="Não foi possível carregar os filtros."
                        onRetry={() => {
                            categories.refetch()
                            services.refetch()
                        }}
                    />
                ) : null}

                <MGButton label="Buscar" onPress={() => publish(draft)} loading={search.isFetching && !search.data} />

                <View style={styles.results}>
                    {query === null ? (
                        <MGEmptyState
                            title="Busque quem atende"
                            description={
                                draft.serviceId || draft.categoryId
                                    ? 'Informe o endereço do atendimento para ver quem atende.'
                                    : 'Informe o endereço e escolha um serviço ou uma modalidade.'
                            }
                        />
                    ) : !search.data && search.isPaused ? (
                        <MGErrorState
                            message="Não foi possível conectar à API. Verifique o servidor e tente novamente."
                            onRetry={() => search.refetch()}
                        />
                    ) : !search.data && !search.isError ? (
                        <View style={styles.status} accessibilityLabel="Buscando groomers">
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.message, { color: colors.text }]}>Buscando groomers</Text>
                        </View>
                    ) : search.isError && !search.data ? (
                        <MGErrorState
                            message={getErrorMessage(search.error)}
                            onRetry={() => search.refetch()}
                        />
                    ) : search.data && search.data.providers.length === 0 ? (
                        <MGEmptyState
                            title="Nenhum groomer encontrado"
                            description="Nenhum groomer atende este endereço."
                        />
                    ) : (
                        search.data?.providers.map(item => {
                            const rating = formatRating(item.average_rating)
                            const price = `A partir de ${formatMoney(item.price)}`
                            return (
                                <GroomerSearchCard
                                    key={item.id}
                                    name={item.name}
                                    priceLabel={price}
                                    coverageLabel={item.service_name}
                                    ratingLabel={rating === 'Sem avaliações' ? undefined : rating}
                                    showChevron
                                    onPress={() => {
                                        if (!query) return
                                        navigation.navigate('GroomerProfile', {
                                            providerServiceId: item.id,
                                            customerLocation: query.address,
                                            ...(query.latitude != null && query.longitude != null
                                                ? { customerLatitude: query.latitude, customerLongitude: query.longitude }
                                                : {}),
                                        })
                                    }}
                                />
                            )
                        })
                    )}
                </View>
            </KeyboardAwareScrollView>
        </ScreenContainer>
    )
}

function FieldWait({ label }: { label: string }) {
    const { colors, radius, spacing: gap, elevation } = useMGTheme()
    return (
        <View
            accessibilityRole="progressbar"
            accessibilityLabel={label}
            style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: gap.sm,
                paddingHorizontal: gap.md,
                backgroundColor: colors.surface.default,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border.default,
                ...elevation.low,
            }}
        >
            <ActivityIndicator size="small" color={colors.action.primary} />
            <MGText variant="body">{label}</MGText>
        </View>
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
        minHeight: 48,
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
