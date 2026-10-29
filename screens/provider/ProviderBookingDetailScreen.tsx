import { AppAlert } from '../../utils/alert'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { ProviderBookingsStackParamList } from '../../navigation/types'
import { useChangeBookingStatus, useGetBookingById } from '../../hooks/useBooking'
import { borderRadius, fonts, spacing } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'
import { CalendarClock, Hash, MapPin, Clock, User } from 'lucide-react-native'
import { DetailRow } from '../../components/shared/DetailRow'
import { MGButton, MGErrorState, MGText } from '../../design-system/components'
import { BookingStatusBadge } from '../../design-system/patterns'
import { BookingStatus } from '../../types/booking.types'
import { formatDateTime } from '../../utils/formatDate'
import { formatMoney } from '../../utils/formatMoney'
import { useRuntime } from '../../context/RuntimeContext'

type ProviderBookingDetailNavigationProp = StackNavigationProp<ProviderBookingsStackParamList, 'ProviderBookingDetail'>
type ProviderBookingDetailRouteProp = RouteProp<ProviderBookingsStackParamList, 'ProviderBookingDetail'>

type Props = {
    navigation: ProviderBookingDetailNavigationProp,
    route: ProviderBookingDetailRouteProp
}

type NextAction = {
    label: string
    next: BookingStatus
    confirm?: { title: string; message: string; cta: string }
}

const nextActionByStatus: Partial<Record<BookingStatus, NextAction>> = {
    [BookingStatus.PENDING_CONFIRMATION]: {
        label: 'Confirmar agendamento',
        next: BookingStatus.CONFIRMED,
    },
    [BookingStatus.CONFIRMED]: {
        label: 'Iniciar atendimento',
        next: BookingStatus.IN_PROGRESS,
    },
    [BookingStatus.IN_PROGRESS]: {
        label: 'Concluir atendimento',
        next: BookingStatus.COMPLETED,
        confirm: {
            title: 'Concluir o atendimento?',
            message: 'Isso encerra o agendamento e dispara o repasse. Esta ação não pode ser desfeita.',
            cta: 'Concluir atendimento',
        },
    },
}

const ProviderBookingDetailScreen = ({ navigation, route }: Props) => {
    const { bookingId } = route.params
    const { colors } = useTheme()
    const runtime = useRuntime()
    const { data, isLoading, isError } = useGetBookingById(bookingId)
    const { mutateAsync, isPending } = useChangeBookingStatus()

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
                <View style={styles.centered}>
                    <MGErrorState message="Não foi possível carregar este agendamento." />
                </View>
            </ScreenContainer>
        )
    }

    const nextAction = nextActionByStatus[data.booking_status]

    const runTransition = async (next: BookingStatus) => {
      try {
          await mutateAsync({ bookingId, booking_status: next })
      } catch (e) {
          AppAlert.alert('Não foi possível atualizar', 'Algo deu errado ao atualizar este agendamento. Tente novamente.')
      }
    }

    const handleAction = () => {
        if (!nextAction) return

        if (nextAction.confirm) {
            AppAlert.alert(
                nextAction.confirm.title,
                runtime.localTest ? 'Concluir o atendimento de teste? Nenhum repasse será realizado.' : nextAction.confirm.message,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: nextAction.confirm.cta, style: 'default', onPress: () => runTransition(nextAction.next) },
                ]
            )
            return
        }

        runTransition(nextAction.next)
    }

    return (
        <ScreenContainer>
            <ScreenHeader
                title='Detalhe do agendamento'
                description='Gerencie o atendimento deste tutor'
                showBackButton
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header: service name + status */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <MGText variant="title" style={{ flex: 1 }}>
                            {data.service_name}
                        </MGText>
                        <BookingStatusBadge status={data.booking_status} />
                    </View>
                    <MGText variant="bodySmall" color="secondary" style={{ marginTop: spacing.xs }}>
                        para {data.customer_name}
                    </MGText>

                    <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
                        <MGText variant="body" color="secondary">Preço</MGText>
                        <MGText variant="title" color="brand" style={{ fontFamily: fonts.bold }}>{formatMoney(data.price)}</MGText>
                    </View>
                </View>

                {/* Details */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <DetailRow
                        icon={<User size={18} color={colors.primary} />}
                        label="Tutor"
                        value={data.customer_name}
                    />
                    <DetailRow
                        icon={<CalendarClock size={18} color={colors.primary} />}
                        label="Agendado"
                        value={formatDateTime(data.scheduled_at)}
                    />
                    <DetailRow
                        icon={<MapPin size={18} color={colors.primary} />}
                        label="Local"
                        value={data.customer_location}
                    />
                    <DetailRow
                        icon={<Hash size={18} color={colors.primary} />}
                        label="Referência"
                        value={`#${data.id.slice(0, 8).toUpperCase()}`}
                    />
                    <DetailRow
                        icon={<Clock size={18} color={colors.primary} />}
                        label="Solicitado em"
                        value={formatDateTime(data.created_at)}
                        isLast
                    />
                </View>

                {/* Action Button */}
                {nextAction && (
                    <View style={styles.actionContainer}>
                        <MGButton
                            label={nextAction.label}
                            onPress={handleAction}
                            loading={isPending}
                            disabled={isPending}
                        />
                    </View>
                )}
            </ScrollView>
        </ScreenContainer>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    card: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        marginTop: spacing.md,
        paddingTop: spacing.md,
    },
    actionContainer: {
        width: '100%',
    },
})

export default ProviderBookingDetailScreen
