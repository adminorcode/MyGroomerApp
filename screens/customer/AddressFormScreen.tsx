import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { MGButton, MGChip, MGErrorState, MGText, MGTextField } from '../../design-system/components'
import { AddressMapPlaceholder, AddressPlaceCard } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import CurrentLocationActions from '../../components/customer/CurrentLocationActions'
import ServiceLocationMap from '../provider/ServiceLocationMap'
import { useCurrentPlace } from '../../hooks/useCurrentPlace'
import { useCustomerAddresses, useDeleteCustomerAddress, useSaveCustomerAddress } from '../../hooks/useCustomerAddresses'
import { ProfileStackParamList } from '../../navigation/types'
import {
    ADDRESS_LABELS,
    AddressLabel,
    addressLabelName,
    CustomerAddress,
} from '../../services/customerAddress.service'
import { AddressSuggestion, autocompleteServiceLocation, getMapTiles, reverseServiceLocation } from '../../services/provider.service'
import { getErrorMessage } from '../../utils/error'

type Props = {
    navigation: StackNavigationProp<ProfileStackParamList, 'AddressForm'>
    route: RouteProp<ProfileStackParamList, 'AddressForm'>
}

type PickedPoint = { latitude: number, longitude: number, label: string }

export default function AddressFormScreen({ navigation, route }: Props) {
    const { colors, elevation, radius, spacing } = useMGTheme()
    const addressId = route.params?.addressId
    const addresses = useCustomerAddresses()
    const save = useSaveCustomerAddress()
    const remove = useDeleteCustomerAddress()
    const place = useCurrentPlace()
    const current = addresses.data?.find(item => item.id === addressId)
    const [label, setLabel] = useState<AddressLabel | null>(null)
    const [address, setAddress] = useState('')
    const [complement, setComplement] = useState('')
    const [makeDefault, setMakeDefault] = useState(false)
    const [picked, setPicked] = useState<PickedPoint | null>(null)
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [suggesting, setSuggesting] = useState(false)
    const [tileUrl, setTileUrl] = useState<string | null>(null)
    const [tilesReady, setTilesReady] = useState(false)
    const [hydrated, setHydrated] = useState(!addressId)
    const [formError, setFormError] = useState<string | null>(null)
    const [pinError, setPinError] = useState<string | null>(null)
    const [movingPin, setMovingPin] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const suggestTicket = useRef(0)
    const skipSuggest = useRef(false)
    const hideMenu = useRef<ReturnType<typeof setTimeout> | null>(null)
    const addressRef = useRef('')
    const askedGps = useRef(false)
    addressRef.current = address

    useEffect(() => {
        let active = true
        void getMapTiles()
            .then(result => { if (active) setTileUrl(result.data.url) })
            .catch(() => { if (active) setTileUrl(null) })
            .finally(() => { if (active) setTilesReady(true) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        if (!addressId || hydrated || !addresses.data) return
        if (!current) {
            setHydrated(true)
            return
        }
        skipSuggest.current = true
        setLabel(current.label)
        setAddress(current.address)
        setComplement(current.complement ?? '')
        setMakeDefault(current.is_default)
        setPicked({ latitude: current.latitude, longitude: current.longitude, label: current.address })
        setHydrated(true)
    }, [addressId, addresses.data, current, hydrated])

    useEffect(() => {
        if (addressId || askedGps.current || !hydrated) return
        askedGps.current = true
        void place.capture().then(found => {
            if (!found || addressRef.current.trim()) return
            applySuggestion(found)
        })
    }, [addressId, hydrated])

    useEffect(() => {
        const ticket = suggestTicket.current + 1
        suggestTicket.current = ticket
        if (skipSuggest.current) {
            skipSuggest.current = false
            setSuggestions([])
            setSuggesting(false)
            return
        }
        const text = address.trim()
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
    }, [address])

    const applySuggestion = (item: AddressSuggestion) => {
        if (hideMenu.current) clearTimeout(hideMenu.current)
        skipSuggest.current = true
        suggestTicket.current += 1
        setSuggestions([])
        setSuggesting(false)
        setAddress(item.address)
        setPicked({ latitude: item.latitude, longitude: item.longitude, label: item.address })
        setPinError(null)
        setFormError(null)
    }

    const changeAddress = (value: string) => {
        suggestTicket.current += 1
        setAddress(value)
        setPicked(null)
        setSuggestions([])
        setFormError(null)
    }

    const dismissMenu = () => {
        if (hideMenu.current) clearTimeout(hideMenu.current)
        suggestTicket.current += 1
        setSuggestions([])
        setSuggesting(false)
    }

    const movePin = (latitude: number, longitude: number) => {
        setMovingPin(true)
        setPinError(null)
        void reverseServiceLocation(latitude, longitude)
            .then(result => applySuggestion(result.data))
            .catch(error => setPinError(getErrorMessage(error)))
            .finally(() => setMovingPin(false))
    }

    const others = (addresses.data ?? []).filter(item => item.id !== addressId)
    const pickedPoint = picked && picked.label === address.trim() ? picked : null
    const menuOpen = suggestions.length > 0
    const missingCurrent = !!addressId && addresses.isSuccess && !current

    const submit = () => {
        if (!label) {
            setFormError('Escolha casa, trabalho ou outros.')
            return
        }
        if (!pickedPoint) {
            setFormError('Escolha um endereço sugerido ou a sua localização.')
            return
        }
        setFormError(null)
        save.mutate({
            id: addressId,
            body: {
                label,
                address: pickedPoint.label,
                complement: complement.trim() ? complement.trim() : null,
                latitude: pickedPoint.latitude,
                longitude: pickedPoint.longitude,
                is_default: others.length === 0 ? true : makeDefault,
            },
        }, {
            onSuccess: () => navigation.goBack(),
            onError: error => setFormError(getErrorMessage(error)),
        })
    }

    const removeAddress = (replacement?: CustomerAddress) => {
        if (!addressId) return
        remove.mutate({ id: addressId, replacementId: replacement?.id }, {
            onSuccess: () => navigation.goBack(),
            onError: error => setFormError(getErrorMessage(error)),
        })
    }

    return (
        <ScreenContainer>
            <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.md }}>
                <ScreenHeader
                    title={addressId ? 'Editar endereço' : 'Novo endereço'}
                    description="O ponto começa na sua localização e pode ser alterado"
                    showBackButton
                    onBack={() => navigation.goBack()}
                />
                {addresses.isLoading || (!hydrated && !!addressId) ? (
                    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
                        <ActivityIndicator accessibilityLabel="Carregando endereço" color={colors.action.primary} />
                        <MGText>Carregando endereço</MGText>
                    </View>
                ) : addresses.isError ? (
                    <MGErrorState message="Não foi possível carregar os endereços." onRetry={() => { void addresses.refetch() }} />
                ) : missingCurrent ? (
                    <MGErrorState message="Endereço não encontrado." onRetry={() => navigation.goBack()} retryLabel="Voltar" />
                ) : (
                    <>
                        <View style={{ gap: spacing.sm }}>
                            <MGText variant="label">Rótulo</MGText>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                {ADDRESS_LABELS.map(option => (
                                    <MGChip
                                        key={option.id}
                                        label={option.name}
                                        accessibilityLabel={label === option.id ? `${option.name}, selecionado` : option.name}
                                        variant="choice"
                                        selected={label === option.id}
                                        onPress={() => { setLabel(option.id); setFormError(null) }}
                                    />
                                ))}
                            </View>
                        </View>
                        <AddressPlaceCard>
                        <MGTextField
                            compact
                            icon="map-pin"
                            label="Endereço"
                            accessibilityLabel="Endereço"
                            placeholder="Avenida Paulista, São Paulo"
                            role="combobox"
                            aria-expanded={menuOpen}
                            accessibilityState={{ expanded: menuOpen }}
                            value={address}
                            onChangeText={changeAddress}
                            onFocus={() => { if (hideMenu.current) clearTimeout(hideMenu.current) }}
                            onBlur={() => {
                                if (hideMenu.current) clearTimeout(hideMenu.current)
                                hideMenu.current = setTimeout(dismissMenu, 250)
                            }}
                            autoCapitalize="words"
                            maxLength={200}
                            helperText="Digite para ver sugestões"
                            menu={suggesting && suggestions.length === 0 ? (
                                <Wait label="Buscando endereços" />
                            ) : menuOpen ? (
                                <View style={{
                                    maxHeight: 128,
                                    backgroundColor: colors.surface.default,
                                    borderRadius: radius.md,
                                    borderWidth: 1,
                                    borderColor: colors.border.default,
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    ...elevation.overlay,
                                }}>
                                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 128 }} role={'listbox' as 'list'}>
                                        {suggestions.map((item, index) => (
                                            <Pressable
                                                key={`${item.latitude}-${item.longitude}-${item.label}`}
                                                role="option"
                                                accessibilityLabel={item.label}
                                                onPressIn={() => { if (hideMenu.current) clearTimeout(hideMenu.current) }}
                                                onPress={() => applySuggestion(item)}
                                                style={{
                                                    height: 64,
                                                    justifyContent: 'center',
                                                    paddingHorizontal: spacing.md,
                                                    borderTopWidth: index === 0 ? 0 : 1,
                                                    borderTopColor: colors.border.default,
                                                    backgroundColor: colors.surface.default,
                                                }}
                                            >
                                                <MGText numberOfLines={2}>{item.label}</MGText>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : null}
                        />
                        <CurrentLocationActions
                            status={place.status}
                            onPress={() => {
                                void place.capture().then(found => { if (found) applySuggestion(found) })
                            }}
                        />
                        <MGTextField
                            compact
                            icon="building-2"
                            label="Complemento"
                            accessibilityLabel="Complemento"
                            placeholder="Apto, sala, ponto de referência"
                            value={complement}
                            onChangeText={setComplement}
                            maxLength={120}
                            helperText="Opcional"
                        />
                        {pickedPoint ? (
                            <View style={{ gap: spacing.sm }}>
                                {tileUrl ? (
                                    <ServiceLocationMap
                                        latitude={pickedPoint.latitude}
                                        longitude={pickedPoint.longitude}
                                        radiusKm={null}
                                        label={`Mapa do endereço. ${pickedPoint.label}.`}
                                        tileUrl={tileUrl}
                                        onPick={movePin}
                                    />
                                ) : tilesReady ? (
                                    <AddressMapPlaceholder
                                        accessibilityLabel="Mapa indisponível"
                                        label="O mapa não carregou. O ponto continua no endereço escolhido."
                                    />
                                ) : (
                                    <Wait label="Localizando no mapa" />
                                )}
                                <MGText variant="caption" color="secondary">Toque no mapa para ajustar o ponto.</MGText>
                            </View>
                        ) : place.status === 'locating' || movingPin ? (
                            <Wait label="Localizando você no mapa" />
                        ) : (
                            <AddressMapPlaceholder label="Escolha um endereço sugerido para ver o ponto no mapa." />
                        )}
                        {pinError ? <MGText variant="bodySmall" color="error" accessibilityRole="alert">{pinError}</MGText> : null}
                        </AddressPlaceCard>
                        {others.length > 0 ? (
                            <Pressable
                                accessibilityRole="checkbox"
                                accessibilityLabel="Marcar como padrão"
                                accessibilityState={{ checked: makeDefault }}
                                onPress={() => setMakeDefault(value => !value)}
                                style={{ minHeight: 48, justifyContent: 'center' }}
                            >
                                <MGText>{makeDefault ? 'Padrão marcado' : 'Marcar como padrão'}</MGText>
                            </Pressable>
                        ) : (
                            <MGText variant="caption" color="secondary">Este endereço fica como padrão.</MGText>
                        )}
                        {formError ? <MGText variant="bodySmall" color="error" accessibilityRole="alert">{formError}</MGText> : null}
                        <MGButton label="Salvar endereço" onPress={submit} loading={save.isPending} disabled={save.isPending || remove.isPending} />
                        {addressId && current ? (
                            current.is_default && others.length > 0 ? (
                                <View style={{ gap: spacing.sm }}>
                                    <MGText variant="label">Escolha outro endereço padrão</MGText>
                                    {others.map(item => (
                                        <MGButton
                                            key={item.id}
                                            label={`Excluir e usar ${addressLabelName(item.label)}`}
                                            accessibilityLabel={`Excluir e usar ${addressLabelName(item.label)} como padrão`}
                                            variant="destructive"
                                            onPress={() => removeAddress(item)}
                                            loading={remove.isPending}
                                        />
                                    ))}
                                </View>
                            ) : confirmDelete ? (
                                <MGButton
                                    label="Confirmar exclusão"
                                    accessibilityLabel="Confirmar exclusão"
                                    variant="destructive"
                                    onPress={() => removeAddress()}
                                    loading={remove.isPending}
                                />
                            ) : (
                                <MGButton
                                    label="Excluir endereço"
                                    accessibilityLabel="Excluir endereço"
                                    variant="secondary"
                                    onPress={() => setConfirmDelete(true)}
                                />
                            )
                        ) : null}
                    </>
                )}
            </KeyboardAwareScrollView>
        </ScreenContainer>
    )
}

function Wait({ label }: { label: string }) {
    const { colors, spacing } = useMGTheme()
    return (
        <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ActivityIndicator size="small" color={colors.action.primary} />
            <MGText>{label}</MGText>
        </View>
    )
}
