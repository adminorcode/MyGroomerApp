import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useFetchCategories } from '../../hooks/useCategory'
import { useGetAllServices } from '../../hooks/useServices'
import { useCoverageSearch } from '../../hooks/useProviders'
import { CoverageProvider, CoverageSearchParams } from '../../types/provider.types'
import CurrentLocationActions from '../../components/customer/CurrentLocationActions'
import { useCurrentPlace } from '../../hooks/useCurrentPlace'
import { useCustomerAddresses } from '../../hooks/useCustomerAddresses'
import { addressLabelName, CustomerAddress } from '../../services/customerAddress.service'
import { addFavoriteProvider, removeFavoriteProvider } from '../../services/favorite.service'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { MGIconName } from '../../design-system/components/MGIcon'
import { spacing } from '../../design-system/tokens'
import { MGButton, MGChip, MGEmptyState, MGErrorState, MGIcon, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { GroomerSearchCard } from '../../design-system/patterns'
import { formatMoney } from '../../utils/formatMoney'
import { formatRating } from '../../utils/formatRating'
import { getErrorMessage } from '../../utils/error'
import SearchFilterPanel from '../../components/customer/search/SearchFilterPanel'
import { filterSearchProviders, SearchFilterValues, SearchPanel, SearchSort } from '../../components/customer/search/searchFilters'

type Props = {
    navigation: StackNavigationProp<HomeStackParamList, 'TutorSearch'>
    route: RouteProp<HomeStackParamList, 'TutorSearch'>
}

type Option = { id: string, name: string }
type ChosenAddress = { id?: string, address: string, latitude: number, longitude: number }
type Tab = 'groomers' | 'servicos'
type ServiceGroup = { id: string, name: string, providers: CoverageProvider[], minPrice: number }
const PAGE_SIZE = 15

function fromSaved(item: CustomerAddress): ChosenAddress {
    return { id: item.id, address: item.address, latitude: item.latitude, longitude: item.longitude }
}

function countLabel(count: number) {
    return count === 1 ? '1 groomer' : `${count} groomers`
}

function categoryIcon(name: string): MGIconName {
    if (/tosa/i.test(name) && /banho/i.test(name)) return 'scissors'
    if (/tosa/i.test(name)) return 'scissors'
    if (/banho/i.test(name)) return 'shower-head'
    if (/higiene/i.test(name)) return 'paw-print'
    return 'ellipsis'
}

function saoPauloDate(instant: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}

function availabilityCopy(item: CoverageProvider) {
    if (item.available_today) return 'Disponível hoje'
    if (!item.next_available_on) return undefined
    const today = saoPauloDate(new Date())
    const tomorrow = saoPauloDate(new Date(new Date(`${today}T12:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000))
    if (item.next_available_on === tomorrow) return 'Próxima disponibilidade: amanhã'
    const label = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short' })
        .format(new Date(`${item.next_available_on}T12:00:00-03:00`))
    return `Próxima disponibilidade: ${label}`
}

function useDebounced(value: string, delay: number) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const handle = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(handle)
    }, [value, delay])
    return debounced
}

/**
 * Quem atende (plano 028): a marca fica no topo autenticado.
 * A faixa teal traz voltar e o título. Modalidade, ordenação, preço, avaliação e raio abrem cada um o seu painel.
 */
export default function TutorSearchScreen({ navigation, route }: Props) {
    const theme = useMGTheme()
    const categories = useFetchCategories()
    const [categoryId, setCategoryId] = useState(route.params?.categoryId ?? '')
    const [serviceId, setServiceId] = useState(route.params?.serviceId ?? '')
    const [text, setText] = useState('')
    const [tab, setTab] = useState<Tab>('groomers')
    const [chosen, setChosen] = useState<ChosenAddress | null>(null)
    const [changing, setChanging] = useState(false)
    const [panel, setPanel] = useState<SearchPanel | null>(null)
    const [onlyToday, setOnlyToday] = useState(false)
    const [sortKey, setSortKey] = useState<SearchSort>('relevance')
    const [minPrice, setMinPrice] = useState<number | null>(null)
    const [maxPrice, setMaxPrice] = useState<number | null>(null)
    const [onlyReviewed, setOnlyReviewed] = useState(false)
    const [minRating, setMinRating] = useState<number | null>(null)
    const [maxKm, setMaxKm] = useState<number | null>(null)
    const [query, setQuery] = useState<CoverageSearchParams | null>(null)
    const [openServiceId, setOpenServiceId] = useState<string | null>(null)
    const [shown, setShown] = useState(PAGE_SIZE)
    const [favorites, setFavorites] = useState<Record<string, boolean>>({})
    const debouncedText = useDebounced(text, 300)
    const totalRef = useRef(0)
    const scrollReady = useRef(false)

    const catalog = useGetAllServices()
    const search = useCoverageSearch(query)
    const savedAddresses = useCustomerAddresses()
    const place = useCurrentPlace()
    const seeded = useRef(false)

    useEffect(() => {
        if (!savedAddresses.isSuccess || chosen) return
        const preferred = savedAddresses.data?.find(item => item.is_default) ?? savedAddresses.data?.[0]
        if (preferred) {
            setChosen(fromSaved(preferred))
            return
        }
        if (seeded.current) return
        seeded.current = true
        void place.capture().then(found => {
            if (found) setChosen({ address: found.address, latitude: found.latitude, longitude: found.longitude })
        })
    }, [savedAddresses.isSuccess, savedAddresses.data, chosen, place])

    useEffect(() => {
        if (!chosen) return
        const trimmed = debouncedText.trim()
        const next: CoverageSearchParams = {
            address: chosen.address,
            latitude: chosen.latitude,
            longitude: chosen.longitude,
            service_id: serviceId || undefined,
            category_id: categoryId || undefined,
            q: trimmed || undefined,
        }
        setQuery(current => {
            if (
                current
                && current.address === next.address
                && current.latitude === next.latitude
                && current.longitude === next.longitude
                && current.service_id === next.service_id
                && current.category_id === next.category_id
                && current.q === next.q
            ) return current
            return next
        })
        setOpenServiceId(null)
    }, [chosen, categoryId, serviceId, debouncedText])

    const chooseAddress = (item: ChosenAddress) => {
        setChosen(item)
        setChanging(false)
    }

    const providers = search.data?.providers ?? []
    const filterValues: SearchFilterValues = { categoryId, serviceId, minPrice, maxPrice, minRating, onlyReviewed, maxKm, sortKey }
    const filtered = useMemo(() => filterSearchProviders(providers, { categoryId, serviceId, minPrice, maxPrice, minRating, onlyReviewed, maxKm, sortKey }, onlyToday), [providers, categoryId, serviceId, onlyToday, minPrice, maxPrice, minRating, onlyReviewed, maxKm, sortKey])

    const groups = useMemo<ServiceGroup[]>(() => {
        const byId = new Map<string, ServiceGroup>()
        for (const provider of filtered) {
            for (const service of provider.services) {
                if (!service.service_id) continue
                const price = Number(service.price)
                const current = byId.get(service.service_id)
                if (current) {
                    current.providers.push(provider)
                    current.minPrice = Math.min(current.minPrice, price)
                } else {
                    byId.set(service.service_id, { id: service.service_id, name: service.service_name, providers: [provider], minPrice: price })
                }
            }
        }
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    }, [filtered])

    const categoryOptions = (categories.data ?? []) as Option[]
    // Atalhos usam IDs reais do catálogo; não criam modalidades sem oferta.
    const categoryNames = new Set(categoryOptions.map(item => item.name.toLocaleLowerCase('pt-BR')))
    const serviceShortcuts = ((catalog.data ?? []) as Option[]).filter(item => !categoryNames.has(item.name.toLocaleLowerCase('pt-BR')))
    const savedList = savedAddresses.data ?? []
    const filterCount = [Boolean(categoryId), Boolean(serviceId), minPrice != null || maxPrice != null, minRating != null || onlyReviewed, maxKm != null, onlyToday].filter(Boolean).length
    const filterLabel = filterCount === 0 ? 'Filtros' : filterCount === 1 ? 'Filtros, 1 aplicado' : `Filtros, ${filterCount} aplicados`
    const viewing = openServiceId ? groups.find(group => group.id === openServiceId) ?? null : null
    const groomerItems = viewing ? viewing.providers : filtered
    const listItems = tab === 'servicos' && !viewing ? groups : groomerItems
    const resultKey = `${tab}|${viewing?.id ?? ''}|${onlyToday}|${sortKey}|${minPrice ?? ''}|${maxPrice ?? ''}|${minRating ?? ''}|${onlyReviewed}|${maxKm ?? ''}|${query?.address ?? ''}|${query?.category_id ?? ''}|${query?.service_id ?? ''}|${query?.q ?? ''}|${filtered.length}|${groups.length}`
    totalRef.current = listItems.length

    useEffect(() => {
        setShown(PAGE_SIZE)
    }, [resultKey])

    const visibleGroomers = groomerItems.slice(0, shown)
    const visibleGroups = groups.slice(0, shown)

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
        if (!scrollReady.current) {
            scrollReady.current = true
            return
        }
        if (contentOffset.y < 48) return
        const remaining = contentSize.height - layoutMeasurement.height - contentOffset.y
        if (remaining > 320) return
        setShown(current => current >= totalRef.current ? current : Math.min(totalRef.current, current + PAGE_SIZE))
    }

    const togglePanel = (next: SearchPanel) => {
        setPanel(current => current === next ? null : next)
    }

    const chooseCategory = (id: string) => {
        setCategoryId(id)
        setServiceId('')
    }

    const applyPanel = (value: SearchFilterValues) => {
        if (panel === 'preco') { setMinPrice(value.minPrice); setMaxPrice(value.maxPrice) }
        if (panel === 'avaliacao') { setMinRating(value.minRating); setOnlyReviewed(value.onlyReviewed) }
        if (panel === 'raio') setMaxKm(value.maxKm)
        if (panel === 'ordenar') setSortKey(value.sortKey)
        if (panel === 'filtros') { setCategoryId(value.categoryId); setServiceId(value.serviceId) }
        setOpenServiceId(null)
        setPanel(null)
    }

    const isFavorite = (item: CoverageProvider) => favorites[item.provider_id] ?? item.is_favorite === true

    const toggleFavorite = (item: CoverageProvider) => {
        const next = !isFavorite(item)
        setFavorites(current => ({ ...current, [item.provider_id]: next }))
        const request = next ? addFavoriteProvider(item.provider_id) : removeFavoriteProvider(item.provider_id)
        void request.catch(() => setFavorites(current => ({ ...current, [item.provider_id]: !next })))
    }

    const discoveryBand = (
        <View style={styles.headerRow}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                hitSlop={theme.spacing.sm}
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
            >
                <ChevronLeft size={24} color={theme.colors.text.inverse} />
            </Pressable>
            <View style={styles.headerText}>
                <MGText variant="heading2" color="inverse" accessibilityRole="header">Quem atende</MGText>
                <MGText variant="bodySmall" color="inverse">Profissionais que atendem no seu endereço</MGText>
            </View>
        </View>
    )

    return (
        <MGScreen header="teal" headerSlot={discoveryBand}>
            <View style={styles.flex}>
                <ScrollView
                    testID="explorar-scroll"
                    style={styles.flex}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scroll}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                >
                    <View style={[styles.addressCard, { backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, borderRadius: theme.radius.lg }]}>
                        {chosen ? (
                            <>
                                <View style={styles.addressRow}>
                                    <MGIcon name="map-pin" size={18} color={theme.colors.action.primaryText} />
                                    <MGText variant="bodySmall" numberOfLines={2} style={styles.addressText}>{chosen.address}</MGText>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={changing ? 'Fechar troca de endereço' : 'Trocar endereço'}
                                        accessibilityState={{ expanded: changing }}
                                        onPress={() => setChanging(current => !current)}
                                        hitSlop={theme.spacing.md}
                                        style={({ pressed }) => [styles.changeLink, { opacity: pressed ? 0.6 : 1 }]}
                                    >
                                        <MGText variant="label" color="brand">{changing ? 'Fechar' : 'Trocar'}</MGText>
                                        <MGIcon name="chevron-right" size={16} color={theme.colors.action.primaryText} />
                                    </Pressable>
                                </View>
                                {changing ? (
                                    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                                        {savedList.length > 0 ? (
                                            <View style={styles.wrap}>
                                                {savedList.map(item => {
                                                    const selected = chosen.id === item.id
                                                    const name = item.is_default ? `${addressLabelName(item.label)} · Padrão` : addressLabelName(item.label)
                                                    return (
                                                        <MGChip
                                                            key={item.id}
                                                            label={name}
                                                            accessibilityLabel={selected ? `${name}, selecionado` : name}
                                                            selected={selected}
                                                            onPress={() => chooseAddress(fromSaved(item))}
                                                        />
                                                    )
                                                })}
                                            </View>
                                        ) : null}
                                        <CurrentLocationActions
                                            status={place.status}
                                            onPress={() => {
                                                void place.capture().then(found => {
                                                    if (found) chooseAddress({ address: found.address, latitude: found.latitude, longitude: found.longitude })
                                                })
                                            }}
                                        />
                                    </View>
                                ) : null}
                            </>
                        ) : (
                            <View style={{ gap: theme.spacing.sm }}>
                                <MGText variant="bodySmall" color="secondary">
                                    {place.status === 'locating' ? 'Localizando você…' : 'Escolha um endereço para ver quem atende.'}
                                </MGText>
                                {place.status === 'idle' || place.status === 'denied' || place.status === 'unavailable' ? (
                                    <CurrentLocationActions
                                        status={place.status}
                                        onPress={() => {
                                            void place.capture().then(found => {
                                                if (found) chooseAddress({ address: found.address, latitude: found.latitude, longitude: found.longitude })
                                            })
                                        }}
                                    />
                                ) : null}
                                {savedList.length === 0 && place.status !== 'locating' ? (
                                    <MGButton
                                        label="Cadastrar endereço"
                                        variant="tertiary"
                                        fullWidth={false}
                                        onPress={() => navigation.getParent()?.navigate('ProfileTab', { screen: 'Addresses' })}
                                    />
                                ) : null}
                            </View>
                        )}
                    </View>

                    <MGTextField
                        compact
                        hideLabel
                        icon="search"
                        label="Profissional, serviço ou tipo de atendimento"
                        accessibilityLabel="Profissional, serviço ou tipo de atendimento"
                        placeholder="Profissional ou serviço"
                        value={text}
                        onChangeText={setText}
                        maxLength={100}
                        style={{ minHeight: 48, borderWidth: 1, borderRadius: theme.radius.lg }}
                    />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                        <CategoryTile name="Todos" icon="grid" selected={!categoryId && !serviceId} onPress={() => chooseCategory('')} />
                        {categoryOptions.map(option => (
                            <CategoryTile
                                key={option.id}
                                name={option.name}
                                icon={categoryIcon(option.name)}
                                selected={categoryId === option.id && !serviceId}
                                onPress={() => chooseCategory(option.id)}
                            />
                        ))}
                        {serviceShortcuts.map(option => (
                            <CategoryTile key={`service-${option.id}`} name={option.name} icon={categoryIcon(option.name)} selected={serviceId === option.id} onPress={() => { setCategoryId(''); setServiceId(option.id) }} />
                        ))}
                    </ScrollView>

                    <View style={[styles.todayRow, styles.addressCard, { backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm }]}>
                        <MGIcon name="calendar-days" size={20} color={theme.colors.text.primary} />
                        <MGText variant="bodySmall" style={{ flex: 1 }}>Ver apenas disponíveis hoje</MGText>
                        <Switch
                            accessibilityLabel="Ver apenas disponíveis hoje"
                            value={onlyToday}
                            onValueChange={value => { setOnlyToday(value); setOpenServiceId(null) }}
                            trackColor={{ false: theme.colors.border.default, true: theme.colors.action.primary }}
                            thumbColor={theme.colors.surface.default}
                        />
                    </View>

                    <View role="tablist" accessibilityLabel="Como explorar" style={[styles.tabs, { borderBottomColor: theme.colors.border.default }]}>
                        <TabButton label={`Groomers (${filtered.length})`} accessibilityLabel="Groomers" selected={tab === 'groomers'} onPress={() => { setTab('groomers'); setOpenServiceId(null) }} />
                        <TabButton label="Serviços" selected={tab === 'servicos'} onPress={() => setTab('servicos')} />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.pills}>
                        <Pill label={filterLabel} icon="sliders-horizontal" selected={panel === 'filtros'} onPress={() => togglePanel('filtros')} />
                        <Pill label="Ordenar" icon="arrow-up-down" caret active={sortKey !== 'relevance'} selected={panel === 'ordenar'} onPress={() => togglePanel('ordenar')} />
                        <Pill label="Preço" caret active={minPrice != null || maxPrice != null} selected={panel === 'preco'} onPress={() => togglePanel('preco')} />
                        <Pill label="Avaliação" icon="star" caret active={minRating != null || onlyReviewed} selected={panel === 'avaliacao'} onPress={() => togglePanel('avaliacao')} />
                        <Pill label="Raio" icon="map-pin" caret active={maxKm != null} selected={panel === 'raio'} onPress={() => togglePanel('raio')} />
                    </ScrollView>

                    {panel ? (
                        <SlideDown open>
                            <SearchFilterPanel key={panel} panel={panel} value={filterValues}
                                categories={categoryOptions} categoriesLoading={categories.isLoading} categoriesError={categories.isError}
                                onRetryCategories={() => { void categories.refetch() }} address={chosen?.address}
                                onApply={applyPanel} onCancel={() => setPanel(null)} />
                        </SlideDown>
                    ) : null}

                    <View style={styles.results}>
                        {search.data && search.isFetching ? <View style={styles.refreshing} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={theme.colors.action.primary} /><MGText variant="caption" color="secondary">Atualizando resultados…</MGText></View> : null}
                        {query === null ? null : !search.data && search.isPaused && !search.isFetching ? (
                            <MGErrorState message="Não foi possível conectar. Verifique sua internet e tente novamente." onRetry={() => search.refetch()} />
                        ) : !search.data && (search.isFetching || !search.isError) ? (
                            <View style={styles.status} accessibilityLabel="Buscando groomers">
                                <MGText variant="body" style={styles.message}>Buscando groomers</MGText>
                            </View>
                        ) : search.isError && !search.data ? (
                            <MGErrorState message={getErrorMessage(search.error)} onRetry={() => search.refetch()} />
                        ) : filtered.length === 0 ? (
                            <MGEmptyState title="Nenhum groomer encontrado" description="Nenhum groomer atende este endereço." />
                        ) : tab === 'groomers' || viewing ? (
                            <>
                                {viewing ? (
                                    <>
                                        <Pressable accessibilityRole="button" accessibilityLabel="Voltar aos serviços" onPress={() => setOpenServiceId(null)} style={styles.backLink}>
                                            <MGIcon name="chevron-left" size={18} color={theme.colors.action.primaryText} />
                                            <MGText variant="label" color="brand">Serviços</MGText>
                                        </Pressable>
                                        <MGText variant="heading3">{viewing.name}</MGText>
                                        <MGText variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                                            {countLabel(viewing.providers.length)} atendem no seu endereço
                                        </MGText>
                                    </>
                                ) : null}
                                {visibleGroomers.map(item => (
                                    <ProviderCard
                                        key={item.provider_id}
                                        item={item}
                                        favorite={isFavorite(item)}
                                        onFavorite={() => toggleFavorite(item)}
                                        onPress={() => openProfile(item)}
                                    />
                                ))}
                            </>
                        ) : (
                            <>
                                {visibleGroups.map(group => (
                                    <Pressable
                                        key={group.id}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${group.name}, ${countLabel(group.providers.length)}, a partir de ${formatMoney(group.minPrice)}`}
                                        onPress={() => setOpenServiceId(group.id)}
                                        style={({ pressed }) => [styles.serviceCard, { backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, opacity: pressed ? 0.92 : 1 }]}
                                    >
                                        <View style={{ flex: 1, gap: theme.spacing.xs }}>
                                            <MGText variant="title">{group.name}</MGText>
                                            <MGText variant="bodySmall" color="secondary">{countLabel(group.providers.length)}</MGText>
                                            <MGText variant="bodySmall" color="teal" style={{ fontFamily: theme.fonts.bold }}>{`A partir de ${formatMoney(group.minPrice)}`}</MGText>
                                        </View>
                                        <MGIcon name="chevron-right" size={20} color={theme.colors.text.secondary} />
                                    </Pressable>
                                ))}
                                <MGText variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
                                    Serviços sem groomer no seu raio não aparecem aqui.
                                </MGText>
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        </MGScreen>
    )

    function openProfile(item: CoverageProvider) {
        if (!query) return
        navigation.navigate('GroomerProfile', {
            providerServiceId: item.id,
            customerLocation: query.address,
            ...(query.latitude != null && query.longitude != null
                ? { customerLatitude: query.latitude, customerLongitude: query.longitude }
                : {}),
        })
    }
}

function ProviderCard({ item, favorite, onFavorite, onPress }: { item: CoverageProvider, favorite: boolean, onFavorite: () => void, onPress: () => void }) {
    const rating = formatRating(item.average_rating)
    return (
        <GroomerSearchCard
            variant="discovery"
            name={item.name}
            services={item.services.map(service => service.service_name)}
            priceLabel={formatMoney(item.price)}
            ratingLabel={rating === 'Sem avaliações' ? undefined : rating}
            reviewCount={item.review_count}
            distanceLabel={`${Number(item.distance_km).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`}
            photoUrl={item.profile_picture}
            verified={item.is_verified === true}
            availabilityLabel={availabilityCopy(item)}
            homeLabel={item.attends_at_home ? 'Atendimento domiciliar' : undefined}
            favorite={favorite}
            onFavorite={onFavorite}
            onPress={onPress}
        />
    )
}

function CategoryTile({ name, icon, selected, onPress }: { name: string, icon: MGIconName, selected: boolean, onPress: () => void }) {
    const { colors, radius, spacing: gap } = useMGTheme()
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={selected ? `${name}, selecionado` : name}
            accessibilityState={{ selected }}
            onPress={onPress}
            style={({ pressed }) => [
                styles.category,
                {
                    borderRadius: radius.lg,
                    backgroundColor: selected ? colors.brand.pinkLight : colors.surface.pinkSubtle,
                    opacity: pressed ? 0.92 : 1,
                    padding: gap.sm,
                },
            ]}
        >
            <MGIcon name={icon} size={26} color={colors.action.primaryText} />
            <MGText variant="bodySmall" numberOfLines={2} style={{ color: colors.text.primary, textAlign: 'center' }}>{name}</MGText>
        </Pressable>
    )
}

function Pill({ label, icon, caret = false, selected, active = false, onPress }: { label: string, icon?: MGIconName, caret?: boolean, selected: boolean, active?: boolean, onPress: () => void }) {
    const { colors, radius } = useMGTheme()
    const visible = label.replace(/, (\d+) aplicados?$/, ' ($1)')
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={active ? 'Seleção aplicada. Abra para revisar ou alterar.' : 'Abre as opções. Confirme as mudanças em Aplicar.'}
            accessibilityState={{ expanded: selected }}
            onPress={onPress}
            style={({ pressed }) => [
                styles.pill,
                {
                    borderRadius: radius.pill,
                    borderColor: selected || active ? colors.action.primaryOutline : colors.border.default,
                    backgroundColor: selected || active ? colors.surface.pinkSubtle : colors.surface.default,
                    opacity: pressed ? 0.92 : 1,
                },
            ]}
        >
            {icon ? <MGIcon name={icon} size={16} color={colors.text.primary} /> : null}
            <MGText variant="caption" style={{ color: colors.text.primary }}>{visible}</MGText>
            {caret ? <MGIcon name={selected ? "chevron-up" : "chevron-down"} size={14} color={colors.action.primaryText} /> : null}
        </Pressable>
    )
}

function TabButton({ label, accessibilityLabel, selected, onPress }: { label: string, accessibilityLabel?: string, selected: boolean, onPress: () => void }) {
    const { colors } = useMGTheme()
    return (
        <Pressable
            role="tab"
            accessibilityRole="tab"
            accessibilityLabel={accessibilityLabel ?? label}
            aria-selected={selected}
            accessibilityState={{ selected }}
            onPress={onPress}
            style={[styles.tab, { borderBottomColor: selected ? colors.action.primary : 'transparent' }]}
        >
            <MGText variant="label" style={{ color: selected ? colors.action.primaryText : colors.text.secondary }}>{label}</MGText>
        </Pressable>
    )
}

function SlideDown({ open, children }: { open: boolean, children: ReactNode }) {
    const [mounted, setMounted] = useState(open)
    const [reduceMotion, setReduceMotion] = useState(false)
    const progress = useRef(new Animated.Value(open ? 1 : 0)).current
    const translateY = useRef(progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] })).current

    useEffect(() => {
        let active = true
        AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value) })
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
        return () => { active = false; subscription.remove() }
    }, [])

    useEffect(() => {
        if (open) setMounted(true)
        const animation = Animated.timing(progress, {
            toValue: open ? 1 : 0,
            duration: reduceMotion ? 0 : 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        })
        animation.start(({ finished }) => { if (finished && !open) setMounted(false) })
        return () => animation.stop()
    }, [open, progress, reduceMotion])

    if (!mounted) return null
    return (
        <Animated.View accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={{ transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    backButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1, gap: spacing.xxs },
    scroll: { paddingBottom: spacing.xl },
    addressCard: { borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.md },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    addressText: { flex: 1 },
    changeLink: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    categories: { gap: spacing.sm, paddingVertical: spacing.md },
    category: { width: 76, minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: spacing.md },
    tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3 },
    filterScroll: { flexGrow: 0, marginBottom: spacing.sm },
    pills: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
    pill: { minHeight: 48, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    panel: { borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
    groupLabel: { marginBottom: spacing.sm },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
    option: { minHeight: 48, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    clearFilters: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
    results: { marginTop: spacing.sm, minHeight: 120 },
    serviceCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: spacing.base, marginBottom: spacing.sm },
    backLink: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.xs, marginBottom: spacing.sm },
    status: { alignItems: 'center', gap: spacing.md },
    refreshing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
    message: { textAlign: 'center' },
})
