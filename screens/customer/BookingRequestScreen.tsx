import { useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ChevronLeft, Info } from 'lucide-react-native'
import { HomeStackParamList } from '../../navigation/types'
import { useGetProviderServiceById } from '../../hooks/useProviders'
import { usePets } from '../../hooks/usePets'
import { createBooking, getBookingSlots, BookingSlots } from '../../services/booking.service'
import { Booking, BookingStatus, CreateBookingResponse } from '../../types/booking.types'
import { BookingStatusBadge, BookingSummary, BookingSummaryRow } from '../../design-system/patterns'
import { MGButton, MGCard, MGErrorState, MGIconButton, MGScreen, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { formatMoney } from '../../utils/formatMoney'
import { getErrorMessage } from '../../utils/error'
import { bookingClock, bookingDateKey, bookingDateLabel } from './bookingSlotsModel'

const slotGoneMessage = 'Este horário não está mais disponível. Escolha outro horário.'
const nextStepMessage = 'O profissional precisa aceitar. Nenhuma cobrança foi feita.'
const dateLabelOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'BookingRequest'>
  route: RouteProp<HomeStackParamList, 'BookingRequest'>
}

type SentRequest = {
  created: boolean
  message: string
  booking: Booking
}

const detailsRows = (
  providerName: string,
  petName: string,
  serviceName: string,
  scheduledAt: string,
  customerLocation: string,
): BookingSummaryRow[] => {
  const date = bookingDateKey(scheduledAt)
  return [
    { label: 'Profissional', value: providerName },
    { label: 'Pet', value: petName },
    { label: 'Serviço', value: serviceName },
    { label: 'Data', value: bookingDateLabel(date, dateLabelOptions) },
    { label: 'Horário', value: bookingClock(scheduledAt) },
    { label: 'Local', value: customerLocation },
  ]
}

function PaymentCard({ price }: { price: number }) {
  const { spacing } = useMGTheme()
  const value = formatMoney(price)

  return (
    <MGCard>
      <MGText variant="heading3">Pagamento</MGText>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginTop: spacing.sm,
      }}>
        <MGText variant="body" color="secondary">Valor estimado</MGText>
        <MGText variant="numeric" color="info" accessibilityLabel={`Valor estimado: ${value}`}>{value}</MGText>
      </View>
      <MGText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
        Sujeito ao porte do pet e ao serviço escolhido.
      </MGText>
    </MGCard>
  )
}

function AvailabilityNote() {
  const { colors, spacing } = useMGTheme()

  return (
    <MGCard variant="teal" padding={spacing.sm}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
        <Info size={16} color={colors.feedback.info} />
        <MGText variant="caption" style={{ flex: 1 }}>
          O agendamento dependerá da confirmação de disponibilidade e das regras do profissional.
        </MGText>
      </View>
    </MGCard>
  )
}

export default function BookingRequestScreen({ navigation, route }: Props) {
  const { colors, spacing } = useMGTheme()
  const queryClient = useQueryClient()
  const { providerServiceId, petId, scheduledAt } = route.params
  const customerLocation = route.params.customerLocation?.trim() ?? ''
  const service = useGetProviderServiceById(providerServiceId)
  const pets = usePets()
  const pet = pets.data?.find(item => item.id === petId)
  const date = bookingDateKey(scheduledAt)
  const slotsKey = ['booking-request-slots', providerServiceId, petId, date] as const
  const slots = useQuery({
    queryKey: slotsKey,
    queryFn: ({ signal }) => getBookingSlots(providerServiceId, petId, date, signal),
    enabled: !!providerServiceId && !!petId && !!service.data,
    retry: false, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false,
  })
  const [sent, setSent] = useState<SentRequest | null>(null)
  const [requestError, setRequestError] = useState('')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)

  const loading = service.isLoading || pets.isLoading || slots.isLoading
  const failed = service.isError || pets.isError || slots.isError
  const petMissing = !pets.isLoading && !pets.isError && !pet
  const slotAvailable = !!slots.data && slots.data.slots.includes(scheduledAt)
  const ready = !!service.data && !!pet && slotAvailable && customerLocation.length > 0

  const retry = () => {
    if (service.isError) void service.refetch()
    if (pets.isError || petMissing) void pets.refetch()
    if (slots.isError || !slotAvailable) void slots.refetch()
  }

  const sendRequest = async () => {
    if (sendingRef.current || !ready) return
    sendingRef.current = true
    setSending(true)
    setRequestError('')
    try {
      const response: CreateBookingResponse = await createBooking({
        pet_id: pet.id,
        provider_service_id: providerServiceId,
        scheduled_at: scheduledAt,
        customer_location: customerLocation,
        ...(route.params.customerLatitude != null && route.params.customerLongitude != null
          ? { customer_latitude: route.params.customerLatitude, customer_longitude: route.params.customerLongitude }
          : {}),
      })
      setSent({ created: response.data.created, message: response.message, booking: response.data.booking })
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['booking'] })
      void queryClient.invalidateQueries({ queryKey: ['booking-slots'] })
    } catch (error) {
      const message = getErrorMessage(error)
      setRequestError(message)
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        if (message === slotGoneMessage) {
          queryClient.setQueryData<BookingSlots>(slotsKey, cached => cached
            ? { ...cached, slots: cached.slots.filter(iso => iso !== scheduledAt) }
            : cached)
        }
        void slots.refetch()
        void queryClient.invalidateQueries({ queryKey: ['booking-slots'] })
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm }}>
      <MGIconButton accessibilityLabel="Voltar" icon={<ChevronLeft color={colors.text.primary} size={24} />}
        onPress={() => navigation.goBack()} disabled={sending} style={{ minHeight: 48, minWidth: 48 }} />
      <MGText variant="heading2" style={{ flex: 1 }}>Resumo do agendamento</MGText>
    </View>
  )

  if (sent) {
    const booking = sent.booking
    return (
      <MGScreen safeArea={false} scrollable
        contentStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}
        footer={(
          <View style={{ width: '100%', maxWidth: 688, alignSelf: 'center' }}>
            <MGButton label="Ver solicitação" onPress={() => navigation.getParent()?.navigate('BookingsTab', {
              screen: 'BookingDetail', params: { bookingId: booking.id },
            })} />
          </View>
        )}>
        {header}
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <MGText variant="heading3">Solicitação enviada</MGText>
            {sent.created ? null : (
              <MGText variant="bodySmall" color="secondary" accessibilityLabel="Aviso: esta solicitação já foi enviada">
                Esta solicitação já foi enviada
              </MGText>
            )}
            <View accessible accessibilityLabel="Status: Aguardando confirmação" style={{ gap: spacing.xs }}>
              <MGText variant="label" color="secondary">Status</MGText>
              <BookingStatusBadge status={BookingStatus.PENDING_CONFIRMATION} />
            </View>
            <View accessible accessibilityLabel={`Próximo passo: ${nextStepMessage}`} style={{ gap: spacing.xs }}>
              <MGText variant="label" color="secondary">Próximo passo</MGText>
              <MGText variant="body">{nextStepMessage}</MGText>
            </View>
          </View>
          <BookingSummary title="Detalhes do serviço" rows={detailsRows(
            booking.provider_name,
            booking.pet_name ?? '',
            booking.service_name,
            booking.scheduled_at,
            booking.customer_location,
          )} />
          <PaymentCard price={booking.price} />
        </View>
      </MGScreen>
    )
  }

  if (loading) {
    return (
      <MGScreen safeArea={false}
        footer={(
          <View style={{ width: '100%', maxWidth: 688, alignSelf: 'center' }}>
            <MGButton label="Solicitar agendamento" onPress={() => { void sendRequest() }} disabled />
          </View>
        )}>
        {header}
        <View style={{ gap: spacing.sm, alignItems: 'center', padding: spacing.xl }}>
          <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando resumo" />
          <MGText>Carregando resumo</MGText>
        </View>
      </MGScreen>
    )
  }

  if (failed || petMissing || !service.data) {
    return (
      <MGScreen safeArea={false}>
        {header}
        <MGErrorState
          message={petMissing ? 'Não foi possível carregar este pet.' : 'Não foi possível carregar o resumo da solicitação.'}
          onRetry={retry}
        />
      </MGScreen>
    )
  }

  const blocked = !slotAvailable
  const alertMessage = requestError || (blocked ? slotGoneMessage : '')
  return (
    <MGScreen safeArea={false} scrollable
      contentStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}
      footer={(
        <View style={{ width: '100%', maxWidth: 688, alignSelf: 'center', gap: spacing.sm }}>
          {sending ? <MGText variant="bodySmall" accessibilityLiveRegion="polite" accessibilityLabel="Enviando solicitação">
            Enviando solicitação…
          </MGText> : null}
          <MGButton label="Solicitar agendamento" onPress={() => { void sendRequest() }}
            loading={sending} disabled={!ready} />
        </View>
      )}>
      {header}
      <View style={{ gap: spacing.base }}>
        <BookingSummary title="Detalhes do serviço" rows={detailsRows(
          service.data.provider_name,
          pet?.name ?? '',
          service.data.service_name,
          scheduledAt,
          customerLocation,
        )} />
        {slotAvailable && slots.data ? <PaymentCard price={slots.data.price} /> : null}
        {alertMessage ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ gap: spacing.sm }}>
            <MGText color="error">{alertMessage}</MGText>
            {blocked ? <MGText variant="bodySmall">Volte e escolha outro horário disponível.</MGText> : null}
          </View>
        ) : (
          <AvailabilityNote />
        )}
      </View>
    </MGScreen>
  )
}
