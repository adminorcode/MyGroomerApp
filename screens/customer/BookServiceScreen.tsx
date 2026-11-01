import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native'
import * as WebBrowser from 'expo-web-browser'
import axios from 'axios'
import { HomeStackParamList } from '../../navigation/types'
import { useGetProviderServiceById } from '../../hooks/useProviders'
import { useCreateBooking } from '../../hooks/useBooking'
import { usePets } from '../../hooks/usePets'
import PetPicker from '../../components/customer/PetPicker'
import { MGButton, MGCard, MGErrorState, MGIconButton, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { TimeSlotPicker } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { findBookingById, getBookingSlots } from '../../services/booking.service'
import { BookingStatus } from '../../types/booking.types'
import { useRuntime } from '../../context/RuntimeContext'
import { formatMoney } from '../../utils/formatMoney'
import { getErrorMessage } from '../../utils/error'
import { AppAlert } from '../../utils/alert'
import { addBookingDays, bookingClock, bookingDateLabel, bookingToday } from './bookingSlotsModel'

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'BookService'>
  route: RouteProp<HomeStackParamList, 'BookService'>
}

export default function BookServiceScreen({ navigation, route }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const runtime = useRuntime()
  const { providerServiceId, petId: requestedPetId } = route.params
  const service = useGetProviderServiceById(providerServiceId)
  const pets = usePets()
  const { mutateAsync: createBooking, isPending } = useCreateBooking()
  const queryClient = useQueryClient()
  const sending = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState('')
  const [selectedPetId, setSelectedPetId] = useState(requestedPetId)
  const [choosingPet, setChoosingPet] = useState(!requestedPetId)
  const [date, setDate] = useState(bookingToday)
  const [firstDate, setFirstDate] = useState(bookingToday)
  const [selection, setSelection] = useState<{ key: string, iso: string } | null>(null)
  const [submitError, setSubmitError] = useState('')
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
  const busy = isSubmitting || isPending

  useEffect(() => {
    if (requestedPetId) { setSelectedPetId(requestedPetId); setSelection(null); setChoosingPet(false) }
  }, [requestedPetId])

  const changeDate = (next: string) => {
    setDate(next); setSelection(null); setSubmitError('')
  }

  const handleBook = async () => {
    if (sending.current || !selectedPet || !selectedSlot || !location.trim()) return
    sending.current = true
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const result = await createBooking({
        pet_id: selectedPet.id, provider_service_id: providerServiceId,
        scheduled_at: new Date(selectedSlot), customer_location: location.trim(),
      })
      const bookingId = result.data.booking.id
      if (result.data.payment_mode === 'disabled') {
        void queryClient.invalidateQueries({ queryKey: ['bookings'] })
        navigation.getParent()?.navigate('BookingsTab', { screen: 'BookingDetail', params: { bookingId } })
        return
      }
      const authUrl = result.data.authorization_url
      if (!authUrl) throw new Error('O pagamento não está disponível')
      await WebBrowser.openAuthSessionAsync(authUrl)
      for (let attempt = 0; attempt < 4; attempt++) {
        const booking = await findBookingById(bookingId)
        if (booking?.data.booking_status === BookingStatus.PENDING_CONFIRMATION) {
          void queryClient.invalidateQueries({ queryKey: ['bookings'] })
          navigation.navigate('Home')
          return
        }
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      AppAlert.alert('Pagamento em processamento', 'Vamos atualizar seu agendamento em instantes.')
    } catch (error) {
      setSubmitError(getErrorMessage(error))
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setSelection(null)
        void slots.refetch()
      }
    } finally { sending.current = false; setIsSubmitting(false) }
  }

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg }}>
      <MGIconButton accessibilityLabel="Voltar" icon={<ChevronLeft color={colors.text.primary} size={24} />}
        onPress={() => navigation.goBack()} disabled={busy} style={{ minHeight: 48, minWidth: 48 }} />
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
            {busy ? <MGText variant="bodySmall" accessibilityLiveRegion="polite">Enviando agendamento…</MGText> : null}
            <MGButton label={runtime.localTest ? 'Criar agendamento de teste' : 'Agendar e pagar'}
              onPress={() => { void handleBook() }} loading={busy}
              disabled={!selectedSlot || !location.trim() || pets.isError || !selectedPet} />
          </View>
        )}>
        {header}
        <MGCard>
          <View style={{ gap: spacing.xs }}>
            <MGText variant="heading3" accessibilityLabel={`Profissional: ${service.data.provider_name}`}>{service.data.provider_name}</MGText>
            <MGText color="info" accessibilityLabel={`Serviço: ${service.data.service_name}`}>{service.data.service_name}</MGText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MGText variant="bodySmall" style={{ flex: 1 }} accessibilityLabel={`Pet: ${selectedPet?.name ?? 'Selecione abaixo'}`}>
              {selectedPet ? `Pet: ${selectedPet.name}` : 'Selecione o pet abaixo para ver os horários.'}
            </MGText>
            {selectedPet && !choosingPet ? <MGButton label="Trocar pet" variant="tertiary" fullWidth={false}
              disabled={busy} onPress={() => setChoosingPet(true)} /> : null}
            </View>
          </View>
        </MGCard>
        {choosingPet || !selectedPet || pets.isError ? <View style={{ marginTop: spacing.lg }}>
          <PetPicker pets={pets.data} isLoading={pets.isLoading} isError={pets.isError} selectedPetId={selectedPetId}
            onSelect={petId => { if (!busy) { setSelectedPetId(petId); setChoosingPet(false); setSelection(null); setSubmitError('') } }}
            onCreate={() => { if (!busy) navigation.navigate('PetForm', { providerServiceId }) }}
            onRetry={() => { void pets.refetch() }} />
        </View> : null}
        <View style={{ gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MGText variant="heading3" style={{ flex: 1 }}>{bookingDateLabel(date, { month: 'long', year: 'numeric' })}</MGText>
            <MGIconButton accessibilityLabel="Dias anteriores" disabled={firstDate <= bookingToday() || busy}
              onPress={() => { const next = addBookingDays(firstDate, -4); setFirstDate(next); changeDate(next) }}
              icon={<ChevronLeft size={20} color={colors.text.primary} />} style={{ minHeight: 48, minWidth: 48 }} />
            <MGIconButton accessibilityLabel="Próximos dias" disabled={busy}
              onPress={() => { const next = addBookingDays(firstDate, 4); setFirstDate(next); changeDate(next) }}
              icon={<ChevronRight size={20} color={colors.text.primary} />} style={{ minHeight: 48, minWidth: 48 }} />
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Dia do atendimento" style={{ flexDirection: 'row', gap: spacing.sm }}>
            {days.map(day => {
              const selected = day === date
              return (
                <Pressable key={day} accessibilityRole="radio" accessibilityLabel={bookingDateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                  accessibilityState={{ selected, disabled: busy }} disabled={busy} onPress={() => changeDate(day)}
                  style={({ pressed }) => ({
                    flex: 1, minHeight: 80, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1,
                    borderColor: selected ? colors.action.primary : colors.border.default,
                    backgroundColor: selected ? colors.action.primary : pressed ? colors.state.pressedSurface : colors.surface.default,
                    alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
                  })}>
                  <MGText variant="bodySmall" color={selected ? 'inverse' : 'secondary'}>{bookingDateLabel(day, { weekday: 'short' }).replace('.', '')}</MGText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <MGText variant="heading3" color={selected ? 'inverse' : 'primary'}>{bookingDateLabel(day, { day: '2-digit' })}</MGText>
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
            <><TimeSlotPicker slots={slots.data.slots.map(iso => ({ id: iso, label: bookingClock(iso), disabled: busy }))}
              selectedSlotId={selectedSlot} onSelectSlot={iso => { setSelection({ key, iso }); setSubmitError('') }} />
              <MGText variant="bodySmall" color="secondary">Duração: {slots.data.duration_minutes} min · {formatMoney(slots.data.price)} para este porte</MGText></>
          ) : (
            <><MGText variant="heading3">Nenhum horário disponível</MGText><MGText color="secondary">Escolha outro dia para este atendimento.</MGText></>
          )}
        </View>
        <MGTextField label="Local" value={location} onChangeText={setLocation} placeholder="Digite seu endereço" autoCapitalize="words" editable={!busy} />
        {submitError ? <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <MGText color="error">{submitError}</MGText><MGText variant="bodySmall">Confira os horários e tente novamente. Seus dados foram mantidos.</MGText>
        </View> : null}
      </MGScreen>
    </KeyboardAvoidingView>
  )
}
