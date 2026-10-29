import { useState } from 'react'
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import { spacing } from '../../constants/theme'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { useTheme } from '../../context/ThemeContext'
import { useGetProviderBookings } from '../../hooks/useBooking'
import BookingStatusFilter from '../../components/shared/BookingStatusFilter'
import { MGEmptyState, MGErrorState } from '../../design-system/components'
import { AgendaAppointmentCard } from '../../design-system/patterns'
import { BookingStatus } from '../../types/booking.types'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProviderBookingsStackParamList } from '../../navigation/types'

type ProviderBookingsScreenNavigationProp = StackNavigationProp<ProviderBookingsStackParamList, 'ProviderBookings'>

type Props = {
    navigation:ProviderBookingsScreenNavigationProp
}

export default function ProviderBookingsScreen({navigation}:Props) {
    const {colors} = useTheme()
    const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>(undefined)
    const {data:bookings, isLoading, isError} = useGetProviderBookings(statusFilter)

    return (
        <ScreenContainer>
            <ScreenHeader
            title='Agendamentos'
            description='Acompanhe os atendimentos dos tutores'
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
                    <AgendaAppointmentCard
                    service_name={item.service_name}
                    provider_name={item.provider_name}
                    price={item.price}
                    scheduled_at={item.scheduled_at}
                    perspective='provider'
                    customer_name={item.customer_name}
                    customer_location={item.customer_location}
                    booking_status={item.booking_status}
                    showChevron
                    onPress={() => navigation.navigate('ProviderBookingDetail', {
                        bookingId: item.id,
                    })}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.centered}>
                    <MGEmptyState
                        title={statusFilter ? 'Nenhum resultado' : 'Nenhum agendamento'}
                        description={
                            statusFilter
                                ? 'Nenhum agendamento com este filtro'
                                : 'Nenhum agendamento de tutores ainda.'
                        }
                    />
                    </View>
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
