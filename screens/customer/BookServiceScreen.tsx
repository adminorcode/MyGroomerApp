import { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native'
import { HomeStackParamList } from '../../navigation/types'
import { useGetProviderServiceById } from '../../hooks/useProviders'
import { usePets } from '../../hooks/usePets'
import PetPicker from '../../components/customer/PetPicker'
import { MGButton, MGCard, MGErrorState, MGIcon, MGIconButton, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { TimeSlotPicker } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { getBookingSlots } from '../../services/booking.service'
import { formatMoney } from '../../utils/formatMoney'
import { getErrorMessage } from '../../utils/error'
import { addBookingDays, bookingClock, bookingDateLabel, bookingToday } from './bookingSlotsModel'

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'BookService'>
  route: RouteProp<HomeStackParamList, 'BookService'>
}

export default function BookServiceScreen({ navigation, route }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const { providerServiceId, petId: requestedPetId } = route.params
  const carriedLocation = route.params.customerLocation?.trim() ?? ''
  const carriedLatitude = route.params.customerLatitude
  const carriedLongitude = route.params.customerLongitude
  const service = useGetProviderServiceById(providerServiceId)
  const pets = usePets()
  const [location, setLocation] = useState(carriedLocation)
  const [selectedPetId, setSelectedPetId] = useState(requestedPetId)
  const [choosingPet, setChoosingPet] = useState(!requestedPetId)
  const [date, setDate] = useState(bookingToday)
  const [firstDate, setFirstDate] = useState(bookingToday)
  const [selection, setSelection] = useState<{ key: string, iso: string } | null>(null)
  const selectedPet = pets.data?.find(pet => pet.id === selectedPetId)
  const key = `${providerServiceId}:${selectedPet?.id ?? ''}:${date}`
  const slots = useQuery({
    queryKey: ['booking-slots', providerServiceId, selectedPet?.id, date],
    queryFn: ({ signal }) => getBookingSlots(providerServiceId, selectedPet!.id, date, signal),
    enabled: !!selectedPet && !!service.data && !pets.isError,
    retry: false, staleTime: 0, refetchOnMount: 'always',
  })
  const selectedSlot = selection?.key === key && !slots.isFetching && !slots.isError
    && slots.data?.slots.includes(selection.iso) ? selection.iso : undefined

  useEffect(() => {
    if (requestedPetId) { setSelectedPetId(requestedPetId); setSelection(null); setChoosingPet(false) }
  }, [requestedPetId])

  const changeDate = (next: string) => {
    setDate(next); setSelection(null)
  }

  const openRequest = () => {
    if (!selectedPet || !selectedSlot || !location.trim()) return
    navigation.navigate('BookingRequest', {
      providerServiceId,
      petId: selectedPet.id,
      scheduledAt: selectedSlot,
      customerLocation: location.trim(),
      ...(carriedLatitude != null && carriedLongitude != null
        ? { customerLatitude: carriedLatitude, customerLongitude: carriedLongitude }
        : {}),
    })
  }

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg }}>
      <MGIconButton accessibilityLabel="Voltar" icon={<ChevronLeft color={colors.text.primary} size={24} />}
        onPress={() => navigation.goBack()} style={{ minHeight: 48, minWidth: 48 }} />
      <MGText variant="heading2" style={{ flex: 1 }}>Escolha um horário</MGText>
    </View>
  )
  if (service.isLoading || service.isError || !service.data) {
    return (
      <MGScreen safeArea={false}>
        {header}
        {service.isLoading ? (
          <View style={{ gap: spacing.sm, alignItems: 'center', padding: spacing.xl }}>
            <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando serviço" />
            <MGText>Carregando serviço</MGText>
          </View>
        ) : <MGErrorState message="Não foi possível carregar este serviço." onRetry={() => { void service.refetch() }} />}
      </MGScreen>
    )
  }
  const days = Array.from({ length: 4 }, (_, index) => addBookingDays(firstDate, index))
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <MGScreen safeArea={false} scrollable
        contentStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}
        footer={(
          <View style={{ width: '100%', maxWidth: 688, alignSelf: 'center', gap: spacing.sm }}>
            {selectedSlot ? <MGText variant="bodySmall" accessibilityLiveRegion="polite">
              {bookingDateLabel(date, { day: '2-digit', month: '2-digit' })} às {bookingClock(selectedSlot)} · {selectedPet?.name}
            </MGText> : null}
            <MGButton label="Revisar solicitação" onPress={openRequest}
              disabled={!selectedSlot || !location.trim() || pets.isError || !selectedPet} />
          </View>
        )}>
        {header}
        <MGCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface.tealSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <MGIcon name="paw-print" color={colors.action.secondary} size={28} />
            </View>
          <View style={{ gap: spacing.xs, flex: 1, minWidth: 0 }}>
            <MGText variant="heading3" accessibilityLabel={`Profissional: ${service.data.provider_name}`}>{service.data.provider_name}</MGText>
            <MGText color="info" accessibilityLabel={`Serviço: ${service.data.service_name}`}>{service.data.service_name}</MGText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MGText variant="bodySmall" style={{ flex: 1 }} accessibilityLabel={`Pet: ${selectedPet?.name ?? 'Selecione abaixo'}`}>
              {selectedPet ? `Pet: ${selectedPet.name}` : 'Selecione o pet abaixo para ver os horários.'}
            </MGText>
            {selectedPet && !choosingPet ? <MGButton label="Trocar pet" variant="tertiary" fullWidth={false}
              onPress={() => setChoosingPet(true)} /> : null}
            </View>
          </View>
          </View>
        </MGCard>
        {choosingPet || !selectedPet || pets.isError ? <View style={{ marginTop: spacing.lg }}>
          <PetPicker pets={pets.data} isLoading={pets.isLoading} isError={pets.isError} selectedPetId={selectedPetId}
            onSelect={petId => { setSelectedPetId(petId); setChoosingPet(false); setSelection(null) }}
            onCreate={() => navigation.navigate('PetForm', {
              providerServiceId,
              customerLocation: carriedLocation || undefined,
              customerLatitude: carriedLatitude,
              customerLongitude: carriedLongitude,
            })}
            onRetry={() => { void pets.refetch() }} />
        </View> : null}
        <View style={{ gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MGText variant="heading3" style={{ flex: 1 }}>{bookingDateLabel(date, { month: 'long', year: 'numeric' })}</MGText>
            <MGIconButton accessibilityLabel="Dias anteriores" disabled={firstDate <= bookingToday()}
              onPress={() => { const next = addBookingDays(firstDate, -4); setFirstDate(next); changeDate(next) }}
              icon={<ChevronLeft size={20} color={colors.text.primary} />} style={{ minHeight: 48, minWidth: 48 }} />
            <MGIconButton accessibilityLabel="Próximos dias"
              onPress={() => { const next = addBookingDays(firstDate, 4); setFirstDate(next); changeDate(next) }}
              icon={<ChevronRight size={20} color={colors.text.primary} />} style={{ minHeight: 48, minWidth: 48 }} />
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Dia do atendimento" style={{ flexDirection: 'row', gap: spacing.sm }}>
            {days.map(day => {
              const selected = day === date
              return (
                <Pressable key={day} accessibilityRole="radio" accessibilityLabel={bookingDateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                  accessibilityState={{ selected }} onPress={() => changeDate(day)}
                  style={({ pressed }) => ({
                    flex: 1, minHeight: 80, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1,
                    borderColor: selected ? colors.action.primary : colors.border.default,
                    backgroundColor: selected ? colors.action.primary : pressed ? colors.state.pressedSurface : colors.surface.default,
                    alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
                  })}>
                  <MGText variant="bodySmall" style={{ color: selected ? colors.onAction.primary : colors.text.secondary }}>{bookingDateLabel(day, { weekday: 'short' }).replace('.', '')}</MGText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <MGText variant="heading3" style={{ color: selected ? colors.onAction.primary : colors.text.primary }}>{bookingDateLabel(day, { day: '2-digit' })}</MGText>
                    {selected ? <Check size={12} color={colors.onAction.primary} /> : null}
                  </View>
                </Pressable>
              )
            })}
          </View>
          <MGText variant="caption" color="secondary">Horários de Brasília</MGText>
        </View>
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
          {!selectedPet || pets.isError ? (
            <><MGText variant="heading3">Horários disponíveis</MGText><MGText color="secondary">Escolha um pet para consultar os horários para o porte dele.</MGText></>
          ) : slots.isFetching ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator size="small" color={colors.action.primary} accessibilityLabel="Buscando horários" /><MGText>Buscando horários…</MGText>
            </View>
          ) : slots.isError ? (
            <MGErrorState message={getErrorMessage(slots.error)} retryLabel="Atualizar horários" onRetry={() => { void slots.refetch() }} />
          ) : slots.data?.slots.length ? (
            <><TimeSlotPicker slots={slots.data.slots.map(iso => ({ id: iso, label: bookingClock(iso) }))}
              selectedSlotId={selectedSlot} onSelectSlot={iso => setSelection({ key, iso })} />
              <MGText variant="bodySmall" color="secondary">Duração: {slots.data.duration_minutes} min · {formatMoney(slots.data.price)} para este porte</MGText></>
          ) : (
            <><MGText variant="heading3">Nenhum horário disponível</MGText><MGText color="secondary">Escolha outro dia para este atendimento.</MGText></>
          )}
        </View>
        <MGCard variant="teal" padding={spacing.md}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <MGIcon name="clock-3" size={18} color={colors.action.secondary} />
            <MGText variant="bodySmall" style={{ flex: 1 }}>A disponibilidade é atualizada para o serviço e o porte do pet. A solicitação depende da confirmação do profissional.</MGText>
          </View>
        </MGCard>
        <View style={{ marginTop: spacing.lg }}>
        {carriedLocation ? (
          <View
            accessible
            accessibilityLabel={`Local do atendimento: ${carriedLocation}`}
            style={{
              gap: spacing.xs,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border.default,
              backgroundColor: colors.surface.default,
            }}
          >
            <MGText variant="label">Local do atendimento</MGText>
            <MGText variant="body">{carriedLocation}</MGText>
          </View>
        ) : (
          <MGTextField label="Local" value={location} onChangeText={setLocation} placeholder="Digite seu endereço" autoCapitalize="words" />
        )}
        </View>
      </MGScreen>
    </KeyboardAvoidingView>
  )
}
