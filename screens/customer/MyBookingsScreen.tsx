import { useState } from 'react'
import { View, ActivityIndicator, FlatList, StyleSheet } from 'react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { BookingsStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { useGetBookings } from '../../hooks/useBooking'
import BookingStatusFilter from '../../components/shared/BookingStatusFilter'
import { BookingStatus } from '../../types/booking.types'
import { MGAvatar, MGCard, MGEmptyState, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import BookingStatusBadge from '../../design-system/patterns/BookingStatusBadge'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { spacing } from '../../design-system/tokens'
import { formatDateTime } from '../../utils/formatDate'
import { formatMoney } from '../../utils/formatMoney'

type MyBookingsScreenNavigationProp = StackNavigationProp<BookingsStackParamList, 'MyBookings'>

type Props = {
    navigation: MyBookingsScreenNavigationProp
}

export default function MyBookingsScreen({navigation}: Props) {
    const { colors, fonts } = useMGTheme()
    const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>(undefined)
    const {data:bookings, isLoading, isError, refetch} = useGetBookings(statusFilter)

  return (
    <ScreenContainer>
        <ScreenHeader
        title='Meus agendamentos'
        description='Acompanhe e gerencie seus atendimentos'
        />

        <BookingStatusFilter selected={statusFilter} onSelect={setStatusFilter} />

        { isLoading ? (
            <View style={styles.centered}>
            <ActivityIndicator accessibilityLabel="Carregando agendamentos" size="large" color={colors.action.primary} />
            <MGText>Carregando agendamentos</MGText>
            </View>
        ) : isError ? (
            <View style={styles.centered}>
              <MGErrorState message="Não foi possível carregar os agendamentos." onRetry={() => { void refetch() }} />
            </View>
        ) : (
            <FlatList
            data={bookings}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <MGCard onPress={() => navigation.navigate('BookingDetail', {
                    bookingId: item.id,
                })}>
                    <View style={styles.row}>
                        <View style={styles.content}>
                            <View style={styles.titleRow}>
                                <MGText variant="title" numberOfLines={2} style={styles.serviceName}>
                                    {item.service_name}
                                </MGText>
                                <BookingStatusBadge status={item.booking_status} />
                            </View>
                            <View style={styles.providerRow}>
                                <MGAvatar name={item.provider_name} tone="teal" size={28} />
                                <MGText variant="bodySmall" color="secondary" numberOfLines={1} style={styles.flex}>
                                    {`por ${item.provider_name}`}
                                </MGText>
                            </View>
                            {item.price != null ? (
                                <MGText variant="bodySmall" color="teal" style={{ fontFamily: fonts.bold }}>
                                    {formatMoney(item.price)}
                                </MGText>
                            ) : null}
                            <View style={styles.infoRow}>
                                <MGIcon name="calendar-days" size={16} color={colors.text.secondary} />
                                <MGText variant="bodySmall" color="secondary" numberOfLines={1} style={styles.flex}>
                                    {formatDateTime(item.scheduled_at)}
                                </MGText>
                            </View>
                            <View style={styles.infoRow}>
                                <MGIcon name="map-pin" size={16} color={colors.brand.teal} />
                                <MGText variant="bodySmall" color="secondary" numberOfLines={2} style={styles.flex}>
                                    {item.customer_location}
                                </MGText>
                            </View>
                        </View>
                        <MGIcon name="chevron-right" size={20} color={colors.text.secondary} />
                    </View>
                </MGCard>
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
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    serviceName: {
      flex: 1,
      minWidth: 80,
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    flex: {
      flex: 1,
    },
  })
