import { AppAlert } from '../../utils/alert'
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import { CalendarClock, MapPin, Star } from 'lucide-react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useGetProviderServiceById } from '../../hooks/useProviders'
import { useCreateBooking } from '../../hooks/useBooking'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { borderRadius, fonts, layout, spacing, typography } from '../../constants/theme'
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
  const { providerServiceId } = route.params
  const { data, isLoading, isError } = useGetProviderServiceById(providerServiceId)
  const { mutateAsync: createBooking, isPending } = useCreateBooking()

  const [scheduledAt, setScheduledAt] = useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState('')
  // const [latitude, setLatitude] = useState<number | undefined>(undefined)
  // const [longitude, setLongitude] = useState<number | undefined>(undefined)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const queryClient = useQueryClient()

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
          provider_service_id: providerServiceId,
          scheduled_at: scheduledAt,
          customer_location: location.trim(),
          // customer_latitude: latitude,
          // customer_longitude: longitude
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
      
      // TODO: Show a loading page after webview before moving home

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
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.error }]}>
            Não foi possível carregar este serviço. Tente novamente.
          </Text>
        </View>
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
          {/* Service details */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.serviceName, { color: colors.text }]}>{data.service_name}</Text>
            <Text style={[styles.providerName, { color: colors.textSecondary }]}>
              por {data.provider_name}
            </Text>

            <View style={styles.metaRow}>
              {data.average_rating != null && (
                <View style={styles.metaItem}>
                  <Star size={16} color={colors.warning} fill={colors.warning} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {data.average_rating}
                    {data.review_count != null ? ` (${data.review_count})` : ''}
                  </Text>
                </View>
              )}
              {data.service_area && (
                <View style={styles.metaItem}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {data.service_area}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Preço</Text>
              <Text style={[styles.price, { color: colors.primary }]}>{formatMoney(data.price)}</Text>
            </View>
          </View>

          {/* Date & time */}
          <Text style={[styles.label, { color: colors.text }]}>Quando</Text>
          <Pressable
            onPress={openPicker}
            style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <CalendarClock size={20} color={colors.primary} />
            <Text style={[styles.fieldText, { color: colors.text }]}>{formattedSchedule}</Text>
          </Pressable>

          {/* Location */}
          <Text style={[styles.label, { color: colors.text }]}>Local</Text>
          <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MapPin size={20} color={colors.primary} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Digite seu endereço"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

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

        {/* Book & Pay */}
        <Pressable
          onPress={handleBook}
          accessibilityRole="button"
          disabled={isPending || isSubmitting}
          style={({ pressed }) => [
            styles.bookButton,
            {
              backgroundColor: isPending || isSubmitting
                ? colors.disabled
                : pressed
                  ? colors.primaryPressed
                  : colors.primary,
            },
          ]}
        >
          {isPending || isSubmitting ? (
            <ActivityIndicator color={colors.onDisabled} />
          ) : (
            <Text style={[styles.bookButtonText, { color: colors.onPrimary }]}>{runtime.localTest ? 'Criar agendamento de teste' : 'Agendar e pagar'}</Text>
          )}
        </Pressable>
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
  message: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  serviceName: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
  },
  providerName: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  priceLabel: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
  },
  price: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
  },
  label: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.medium,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    padding: 0,
  },
  bookButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  bookButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.semibold,
  },
})

