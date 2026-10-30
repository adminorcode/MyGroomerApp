import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGChip, MGEmptyState, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { OnboardingStepper } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useGetServiceLocation, usePreviewServiceLocation, useSaveServiceLocation } from '../../hooks/useProviders'
import { AddressSuggestion, autocompleteServiceLocation, getMapTiles, lookupServicePostalCode } from '../../services/provider.service'
import ServiceLocationMap from './ServiceLocationMap'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { getErrorMessage } from '../../utils/error'
import {
  FEE_OPTIONS,
  LocatedPoint,
  RADIUS_OPTIONS,
  RadiusKm,
  ServiceLocation,
  TravelFeeMode,
  canSaveLocation,
  cepDigits,
  feeAmount,
  feeInput,
  formatCep,
} from './serviceLocationModel'

const steps = [
  { id: 'registration', label: 'Cadastro' },
  { id: 'services', label: 'Serviços' },
  { id: 'location', label: 'Local' },
]

type Props = {
  navigation: StackNavigationProp<ProviderServicesStackParamList, 'ServiceLocation'>
}

function mapLabel(point: LocatedPoint, radiusKm: RadiusKm | null) {
  const radius = radiusKm == null ? 'sem raio escolhido' : `raio de ${radiusKm} km`
  return `Mapa do atendimento. ${point.label}. ${radius}.`
}

export default function ServiceLocationScreen({ navigation }: Props) {
  const { colors, elevation, radius, spacing } = useMGTheme()
  const location = useGetServiceLocation()
  const save = useSaveServiceLocation()
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [complement, setComplement] = useState('')
  const [radiusKm, setRadiusKm] = useState<RadiusKm | null>(null)
  const [travelFeeMode, setTravelFeeMode] = useState<TravelFeeMode | null>(null)
  const [travelFeePerKm, setTravelFeePerKm] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [cepError, setCepError] = useState<string | null>(null)
  const [postalPending, setPostalPending] = useState(false)
  const [tileUrl, setTileUrl] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [picked, setPicked] = useState<LocatedPoint | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const postalTicket = useRef(0)
  const suggestTicket = useRef(0)
  const skipSuggest = useRef(false)
  const hideMenu = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    void getMapTiles()
      .then(result => { if (active) setTileUrl(result.data.url) })
      .catch(() => { if (active) setTileUrl(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!location.data || hydrated) return
    skipSuggest.current = true
    setAddress(location.data.address ?? '')
    setPostalCode(formatCep(location.data.postal_code ?? ''))
    setComplement(location.data.complement ?? '')
    setRadiusKm(location.data.radius_km)
    setTravelFeeMode(location.data.travel_fee_mode)
    setTravelFeePerKm(feeInput(location.data.travel_fee_per_km))
    setHydrated(true)
  }, [location.data, hydrated])

  const addressReady = address.trim().length >= 3
  const postalReady = cepDigits(postalCode).length === 8
  const serverPoint = pointFrom(location.data)
  const fieldsMatchServer = Boolean(
    location.data
    && address.trim() === (location.data.address ?? '').trim()
    && cepDigits(postalCode) === (location.data.postal_code ?? ''),
  )
  const preview = usePreviewServiceLocation(
    address.trim(),
    cepDigits(postalCode),
    addressReady && postalReady && !fieldsMatchServer && !postalPending && picked?.label !== address.trim(),
  )
  const pickedPoint = picked && picked.label === address.trim() ? picked : null
  const point = pickedPoint ?? preview.data ?? (fieldsMatchServer && !preview.isError ? serverPoint : null)
  const locateError = !postalPending && addressReady && postalReady && preview.isError
    ? getErrorMessage(preview.error)
    : null
  const ready = canSaveLocation({
    address,
    postalCode,
    radiusKm,
    travelFeeMode,
    travelFeePerKm,
    located: point != null,
    picked: pickedPoint != null,
  })
  const waiting = location.isLoading || (location.isFetching && !location.data) || (!!location.data && !hydrated && !location.isError)

  const changeAddress = (value: string) => {
    suggestTicket.current += 1
    setAddress(value)
    setPicked(null)
    setSavedNotice(false)
    setSuggestions([])
  }

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

  const chooseSuggestion = (item: AddressSuggestion) => {
    if (hideMenu.current) clearTimeout(hideMenu.current)
    skipSuggest.current = true
    suggestTicket.current += 1
    setSuggestions([])
    setAddress(item.address)
    setPicked({ latitude: item.latitude, longitude: item.longitude, label: item.address })
    if (item.postal_code) setPostalCode(formatCep(item.postal_code))
    setCepError(null)
    setSavedNotice(false)
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

  const changePostalCode = (value: string) => {
    const formatted = formatCep(value)
    setPostalCode(formatted)
    setSavedNotice(false)
    setCepError(null)
    const digits = cepDigits(formatted)
    if (digits.length !== 8) {
      postalTicket.current += 1
      setPostalPending(false)
      return
    }
    const ticket = postalTicket.current + 1
    postalTicket.current = ticket
    setPostalPending(true)
    void lookupServicePostalCode(digits)
      .then(result => {
        if (postalTicket.current !== ticket) return
        skipSuggest.current = true
        suggestTicket.current += 1
        setSuggestions([])
        setPicked(null)
        setAddress(result.data.address)
        setCepError(null)
      })
      .catch(error => {
        if (postalTicket.current !== ticket) return
        setCepError(getErrorMessage(error))
      })
      .finally(() => {
        if (postalTicket.current === ticket) setPostalPending(false)
      })
  }

  const publish = async () => {
    if (!ready || !travelFeeMode || radiusKm == null) return
    setSaveError(null)
    try {
      await save.mutateAsync({
        address: address.trim(),
        postal_code: cepDigits(postalCode).length === 8 ? cepDigits(postalCode) : null,
        ...(pickedPoint ? { latitude: pickedPoint.latitude, longitude: pickedPoint.longitude } : {}),
        complement: complement.trim() ? complement.trim() : null,
        radius_km: radiusKm,
        travel_fee_mode: travelFeeMode,
        travel_fee_per_km: feeAmount(travelFeeMode, travelFeePerKm),
      })
      setSavedNotice(true)
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  return (
    <MGScreen
      safeArea={false}
      scrollable
      loading={waiting}
      error={!waiting && location.isError ? getErrorMessage(location.error) : null}
      onRetry={() => { void location.refetch() }}
      footer={(
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <MGButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
          <View style={{ flex: 1 }}>
            <MGButton
              label="Continuar"
              onPress={() => { void publish() }}
              disabled={!ready || save.isPending}
              loading={save.isPending}
            />
          </View>
        </View>
      )}
    >
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <OnboardingStepper steps={steps} currentStepId="location" />
        <View style={{ gap: spacing.xs }}>
          <MGText variant="heading2">Local de atendimento</MGText>
          <MGText variant="body" color="secondary">
            Informe de onde você sai, até onde atende e como cobra o deslocamento.
          </MGText>
        </View>
        <MGTextField
          label="Endereço-base"
          required
          role="combobox"
          aria-expanded={suggestions.length > 0}
          accessibilityState={{ expanded: suggestions.length > 0 }}
          value={address}
          onChangeText={changeAddress}
          onFocus={() => {
            if (hideMenu.current) clearTimeout(hideMenu.current)
          }}
          onBlur={closeMenuSoon}
          maxLength={200}
          autoCapitalize="words"
          helperText="Digite para ver sugestões, ou informe o CEP"
          menu={suggesting && suggestions.length === 0 ? (
            <FieldWait label="Buscando endereços" />
          ) : suggestions.length > 0 ? (
            <View>
              <Pressable
                accessible={false}
                onPress={dismissMenu}
                style={{ position: 'absolute', left: -32, right: -32, top: 0, height: 640, zIndex: 0 }}
              />
              <View
                style={{
                  maxHeight: 240,
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  overflow: 'hidden',
                  zIndex: 1,
                  ...elevation.overlay,
                }}
              >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={{ maxHeight: 240, backgroundColor: colors.surface.default }}
                // Role omits listbox; the assertion keeps the DOM role listbox.
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
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      backgroundColor: pressed ? colors.surface.pinkSubtle : colors.surface.default,
                      borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: colors.border.default,
                    })}
                  >
                    <MGText variant="body">{item.label}</MGText>
                  </Pressable>
                ))}
              </ScrollView>
              </View>
            </View>
          ) : null}
        />
        <MGTextField
          label="CEP"
          required
          value={postalCode}
          onChangeText={changePostalCode}
          keyboardType="number-pad"
          maxLength={9}
          error={cepError ?? undefined}
          helperText={cepError ? undefined : 'Oito dígitos, no formato 00000-000'}
          menu={postalPending ? <FieldWait label="Buscando o CEP" /> : null}
        />
        <MGTextField
          label="Complemento"
          value={complement}
          onChangeText={value => {
            setComplement(value)
            setSavedNotice(false)
          }}
          maxLength={120}
          helperText="Opcional"
        />
        <View style={{ gap: spacing.sm }}>
          <MGText variant="label">Raio de atendimento</MGText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {RADIUS_OPTIONS.map(option => (
              <MGChip
                key={option}
                label={`${option} km`}
                accessibilityLabel={radiusKm === option ? `${option} km, selecionado` : `${option} km`}
                variant="choice"
                selected={radiusKm === option}
                onPress={() => {
                  setRadiusKm(current => current === option ? null : option)
                  setSavedNotice(false)
                }}
              />
            ))}
          </View>
        </View>
        {point ? (
          <View style={{ gap: spacing.sm }}>
            {tileUrl ? (
              <ServiceLocationMap
                latitude={point.latitude}
                longitude={point.longitude}
                radiusKm={radiusKm}
                label={mapLabel(point, radiusKm)}
                tileUrl={tileUrl}
              />
            ) : null}
            <MGText variant="body">{point.label}</MGText>
            <MGText variant="caption" color="secondary">
              {radiusKm == null ? 'Escolha o raio para ver a área no mapa' : `Raio de ${radiusKm} km`}
            </MGText>
            <MGText variant="caption" color="secondary" style={{ fontSize: 10, lineHeight: 12, marginTop: -spacing.xs }}>
              Powered by Geoapify · OpenStreetMap
            </MGText>
          </View>
        ) : preview.isFetching ? (
          <FieldWait label="Localizando no mapa" />
        ) : (
          <View accessible accessibilityLabel="Mapa sem ponto">
            <MGEmptyState
              title="Mapa sem ponto"
              description={locateError ?? 'Informe um endereço e um CEP localizáveis para ver o ponto e o círculo.'}
            />
          </View>
        )}
        {locateError && point ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert">{locateError}</MGText>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <MGText variant="label">Taxa de deslocamento</MGText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {FEE_OPTIONS.map(option => (
              <MGChip
                key={option.id}
                label={option.label}
                accessibilityLabel={travelFeeMode === option.id ? `${option.label}, selecionada` : option.label}
                variant="choice"
                selected={travelFeeMode === option.id}
                onPress={() => {
                  setTravelFeeMode(option.id)
                  if (option.id !== 'per_km') setTravelFeePerKm('')
                  setSavedNotice(false)
                }}
              />
            ))}
          </View>
          {travelFeeMode === 'per_km' ? (
            <MGTextField
              label="Valor por quilômetro"
              required
              value={travelFeePerKm}
              onChangeText={value => {
                setTravelFeePerKm(value)
                setSavedNotice(false)
              }}
              keyboardType="decimal-pad"
              helperText="Em reais, com até duas casas"
            />
          ) : null}
        </View>
        {saveError ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert">{saveError}</MGText>
        ) : null}
        {savedNotice ? (
          <MGText variant="body" color="success" accessibilityRole="alert">Local de atendimento salvo.</MGText>
        ) : null}
      </View>
    </MGScreen>
  )
}

function pointFrom(location: ServiceLocation | undefined): LocatedPoint | null {
  if (!location?.label || location.latitude == null || location.longitude == null) return null
  return { latitude: location.latitude, longitude: location.longitude, label: location.label }
}

function FieldWait({ label }: { label: string }) {
  const { colors, radius, spacing, elevation } = useMGTheme()
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
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
