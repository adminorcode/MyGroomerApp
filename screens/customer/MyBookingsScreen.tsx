import { useState } from 'react'
import { View, ActivityIndicator, FlatList, StyleSheet } from 'react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { BookingsStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTheme } from '../../context/ThemeContext'
import { useGetBookings } from '../../hooks/useBooking'
import { spacing } from '../../constants/theme'
import { BookingCard } from '../../components/shared/BookingCard'
import BookingStatusFilter from '../../components/shared/BookingStatusFilter'
import { BookingStatus } from '../../types/booking.types'
import { MGEmptyState, MGErrorState } from '../../design-system/components'

type MyBookingsScreenNavigationProp = StackNavigationProp<BookingsStackParamList, 'MyBookings'>

type Props = {
    navigation: MyBookingsScreenNavigationProp
}


export default function MyBookingsScreen({navigation}: Props) {
    const {colors} = useTheme()
    const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>(undefined)
    const {data:bookings, isLoading, isError} = useGetBookings(statusFilter)

  return (
    <ScreenContainer>
        <ScreenHeader
        title='Meus agendamentos'
        description='Acompanhe e gerencie seus atendimentos'
        />

        <BookingStatusFilter selected={statusFilter} onSelect={setStatusFilter} />

        { isLoading ? (
            <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            </View>
        ) : isError ? (
            <View style={styles.centered}>
              <MGErrorState message="Não foi possível carregar os agendamentos." />
            </View>
        ) : (
            <FlatList
            data={bookings}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <BookingCard
                service_name={item.service_name}
                provider_name={item.provider_name}
                price={item.price}
                scheduled_at={item.scheduled_at}
                customer_location={item.customer_location}
                booking_status={item.booking_status}
                showChevron
                onPress={() => navigation.navigate('BookingDetail', {
                    bookingId: item.id,
                })}
                />
            )}
            ListEmptyComponent={
                <MGEmptyState
                  title={statusFilter ? 'Nenhum agendamento' : 'Sem agendamentos'}
                  description={
                    statusFilter
                      ? 'Nenhum agendamento com este filtro'
                      : 'Você ainda não agendou um serviço'
                  }
                />
            }
            keyExtractor={(item) => item.id}
            />
        )}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: spacing.xl,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
  })
