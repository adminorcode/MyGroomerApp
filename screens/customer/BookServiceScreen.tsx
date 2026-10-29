import { AppAlert } from '../../utils/alert'
import { useState, useEffect } from 'react'
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useGetProviderServiceById } from '../../hooks/useProviders'
import { useCreateBooking } from '../../hooks/useBooking'
import { usePets } from '../../hooks/usePets'
import PetPicker from '../../components/customer/PetPicker'
import { useTheme } from '../../context/ThemeContext'
import ScreenHeader from '../../components/shared/ScreenHeader'
import ScreenContainer from '../../components/shared/ScreenContainer'
import { MGButton, MGErrorState, MGTextField } from '../../design-system/components'
import { BookingSummary, TimeSlotPicker } from '../../design-system/patterns'
import { layout, spacing } from '../../constants/theme'
import DateTimePicker from '../../components/shared/ServiceDateTimePicker'
import * as WebBrowser from 'expo-web-browser'
import { findBookingById } from '../../services/booking.service'
import { BookingStatus } from '../../types/booking.types'
import { useQueryClient } from '@tanstack/react-query'
import { useRuntime } from '../../context/RuntimeContext'
import { formatMoney } from '../../utils/formatMoney'

type BookServiceScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'BookService'>
type BookServiceScreenRouteProp = RouteProp<HomeStackParamList, 'BookService'>

type Props = {
  navigation: BookServiceScreenNavigationProp
  route: BookServiceScreenRouteProp
}

export default function BookServiceScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const runtime = useRuntime()
  const { providerServiceId, petId: requestedPetId } = route.params
  const { data, isLoading, isError } = useGetProviderServiceById(providerServiceId)
  const pets = usePets()
  const { mutateAsync: createBooking, isPending } = useCreateBooking()

  const [scheduledAt, setScheduledAt] = useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState('')
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(requestedPetId)
  const [petError, setPetError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (requestedPetId) {
      setSelectedPetId(requestedPetId)
      setPetError('')
    }
  }, [requestedPetId])

  const onChangeDate = (event: any, selected?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false)
      return
    }
    const current = selected ?? scheduledAt
    if (Platform.OS === 'android') {
      setShowPicker(false)
      setScheduledAt(current)
      if (pickerMode === 'date') {
        setTimeout(() => {
          setPickerMode('time')
          setShowPicker(true)
        }, 0)
      }
    } else {
      setScheduledAt(current)
    }
  }

  const openPicker = () => {
    setPickerMode('date')
    setShowPicker(true)
  }

  const verifyBooking = async ({bookingId, attempts=4}: {bookingId:string, attempts?:number}) => {
    for(let i = 0; i<attempts; i++){
      const booking = await findBookingById(bookingId)
      if(booking?.data.booking_status === BookingStatus.PENDING_CONFIRMATION){
        return true
      }
      await new Promise(r=> setTimeout(r,1500))
    }
    return false
  }

  const handleBook = async() => {
    if (!selectedPetId) {
      setPetError('Selecione um pet para o atendimento.')
      return
    }
    if (!location.trim()) {
      AppAlert.alert('Local obrigatório', 'Informe onde o atendimento deve acontecer.')
      return
    }
    if (scheduledAt.getTime() < Date.now()) {
      AppAlert.alert('Horário inválido', 'Escolha uma data e hora no futuro.')
      return
    }

    try {
      setIsSubmitting(true)
      const bookedResponse = await createBooking(
        {
          pet_id: selectedPetId,
          provider_service_id: providerServiceId,
          scheduled_at: scheduledAt,
          customer_location: location.trim(),
        }
      )
      
      const bookingId = bookedResponse.data.booking.id
      if (bookedResponse.data.payment_mode === 'disabled') {
        queryClient.invalidateQueries({ queryKey: ['bookings'] })
        navigation.getParent()?.navigate('BookingsTab', { screen: 'BookingDetail', params: { bookingId } })
        return
      }
      const authUrl = bookedResponse.data.authorization_url
      if (!authUrl) throw new Error('O pagamento não está disponível')
      await WebBrowser.openAuthSessionAsync(authUrl)

      const confirmed = await verifyBooking({bookingId})

      if(confirmed){
        queryClient.invalidateQueries({queryKey:['bookings']})
        navigation.navigate('Home')
      } else {
        AppAlert.alert('Pagamento em processamento', 'Vamos atualizar seu agendamento em instantes.')
      }
    } catch (error) {
      AppAlert.alert('Falha no agendamento', 'Algo deu errado. Tente novamente.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    )
  }

  if (isError || !data) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Agendar serviço" showBackButton onBack={() => navigation.goBack()} />
        <MGErrorState message="Não foi possível carregar este serviço. Tente novamente." />
      </ScreenContainer>
    )
  }

  const formattedSchedule = scheduledAt.toLocaleString('pt-BR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const selectedPet = pets.data?.find((pet) => pet.id === selectedPetId)
  const summaryRows = [
    selectedPet?.name ? { label: 'Pet', value: selectedPet.name } : null,
    data.service_name ? { label: 'Serviço', value: data.service_name } : null,
    data.provider_name ? { label: 'Groomer', value: data.provider_name } : null,
    location.trim() ? { label: 'Local', value: location.trim() } : null,
    { label: 'Data', value: formattedSchedule },
  ].filter((row): row is { label: string; value: string } => Boolean(row))

  return (
    <KeyboardAvoidingView behavior='padding' style={{backgroundColor: colors.background, flex:1}}>
      <View style={styles.content}>
        <ScreenHeader
          title="Agendar serviço"
          description="Confirme os dados e escolha o horário"
          showBackButton
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {summaryRows.length > 0 ? (
            <View style={styles.summaryBlock}>
              <BookingSummary
                rows={summaryRows}
                totalLabel={data.price != null ? 'Preço' : undefined}
                totalValue={data.price != null ? formatMoney(data.price) : undefined}
              />
            </View>
          ) : null}

          <PetPicker
            pets={pets.data}
            isLoading={pets.isLoading}
            isError={pets.isError}
            selectedPetId={selectedPetId}
            error={petError}
            onSelect={(petId) => {
              setSelectedPetId(petId)
              setPetError('')
            }}
            onCreate={() => navigation.navigate('PetForm', { providerServiceId })}
            onRetry={() => { void pets.refetch() }}
          />

          <View style={styles.slotBlock}>
            <TimeSlotPicker
              dateTimeLabel={formattedSchedule}
              onPressDateTime={openPicker}
            />
          </View>

          <MGTextField
            label="Local"
            value={location}
            onChangeText={setLocation}
            placeholder="Digite seu endereço"
            autoCapitalize="words"
          />

          {showPicker && (
            <DateTimePicker
              value={scheduledAt}
              mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onChangeDate}
            />
          )}
        </ScrollView>

        <MGButton
          label={runtime.localTest ? 'Criar agendamento de teste' : 'Agendar e pagar'}
          onPress={handleBook}
          loading={isPending || isSubmitting}
          disabled={pets.isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: { paddingHorizontal: layout.screenPadding , flex:1, paddingTop:20},
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  summaryBlock: {
    marginBottom: spacing.lg,
  },
  slotBlock: {
    marginBottom: spacing.lg,
  },
})
