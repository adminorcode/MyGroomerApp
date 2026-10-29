import { AppAlert } from '../../utils/alert'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { CompositeNavigationProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { BookingsStackParamList, RootParamList } from '../../navigation/types'
import { useChangeBookingStatus, useGetBookingById } from '../../hooks/useBooking'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { CalendarClock, Hash, MapPin, Clock, PawPrint } from 'lucide-react-native'
import { petSizeLabel, petSpeciesLabel } from '../../types/pet.types'
import { DetailRow } from '../../components/shared/DetailRow'
import { MGButton, MGErrorState } from '../../design-system/components'
import { BookingStatus } from '../../types/booking.types'
import { formatDateTime } from '../../utils/formatDate'
import { useCreateConversation } from '../../hooks/useConversations'
import { useRuntime } from '../../context/RuntimeContext'
import { getErrorMessage } from '../../utils/error'
import { formatMoney } from '../../utils/formatMoney'

type BookingDetailNavigationProp = CompositeNavigationProp<
    StackNavigationProp<BookingsStackParamList, 'BookingDetail'>,
    StackNavigationProp<RootParamList>
>
type BookingDetailRouteProp = RouteProp<BookingsStackParamList, 'BookingDetail'>

type Props = {
    navigation: BookingDetailNavigationProp,
    route: BookingDetailRouteProp
}

const BookingDetail = ({ navigation, route }: Props) => {
    const { bookingId } = route.params
    const { colors } = useTheme()
    const runtime = useRuntime()
    const { data, isLoading, isError } = useGetBookingById(bookingId)
    const {mutateAsync, isPending} = useChangeBookingStatus()
    const {mutateAsync: createConvo} = useCreateConversation()


    const cancellableStatuses = [
        BookingStatus.PENDING_PAYMENT,
        BookingStatus.PENDING_CONFIRMATION,
        BookingStatus.CONFIRMED,
    ]

    if(isLoading){
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
                <MGErrorState message="Não foi possível carregar este agendamento." />
            </ScreenContainer>
        )
    }

    const canCancel = cancellableStatuses.includes(data.booking_status)
    const canReview = data.booking_status === BookingStatus.COMPLETED && !data.review_id
    const hasReview = data.booking_status === BookingStatus.COMPLETED && !!data.review_id

    const handleCancel = () => {
        AppAlert.alert(
            'Cancelar agendamento?',
            runtime.localTest ? 'Cancelar esta reserva de teste? Nenhuma cobrança ou reembolso será realizado.' : 'O reembolso pode ter uma taxa de cancelamento, conforme o horário.',
            [
                { text: 'Manter agendamento', style: 'cancel' },
                { text: 'Cancelar agendamento', style: 'destructive', onPress: () => {
                    void mutateAsync({ bookingId, booking_status: BookingStatus.CANCELLED }).catch(error => AppAlert.alert('Não foi possível cancelar', getErrorMessage(error)))
                } },
            ]
        )
    }

    const handleMessage = async () => {
        try {
            const res = await createConvo({booking_id: data.id, provider_id:data.provider_user_id})
            const conversation = res.data
            navigation.navigate('Chat', {conversationId:conversation.id, otherName:data.provider_name})
        } catch (error) {
            AppAlert.alert('Não foi possível abrir a conversa', getErrorMessage(error))
        }
    }

    return (
        <ScreenContainer>
            <ScreenHeader
                title='Detalhe do agendamento'
                description='Dados deste atendimento'
                showBackButton
                onBack={() => navigation.goBack()}
            />

            {(
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header: service name + status */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.serviceName, { color: colors.text }]}>
                                {data.service_name}
                            </Text>
                            <StatusBadge status={data.booking_status} />
                        </View>
                        <Text style={[styles.providerName, { color: colors.textSecondary }]}>
                            por {data.provider_name}
                        </Text>

                        <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Preço</Text>
                            <Text style={[styles.price, { color: colors.primary }]}>{formatMoney(data.price)}</Text>
                        </View>
                    </View>

                    {/* Details */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                        {data.pet_name ? (
                            <DetailRow
                                icon={<PawPrint size={18} color={colors.primary} />}
                                label="Pet"
                                value={[
                                    data.pet_name,
                                    data.pet_species ? petSpeciesLabel(data.pet_species) : null,
                                    data.pet_size ? petSizeLabel(data.pet_size) : null,
                                    data.pet_age_years != null ? `${data.pet_age_years} anos` : null,
                                ].filter(Boolean).join(' · ')}
                            />
                        ) : null}
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

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                        {
                            canCancel && (
                                <>
                                    <MGButton
                                    label={isPending ? 'Cancelando...' : 'Cancelar'}
                                    variant="destructive"
                                    onPress={handleCancel}
                                    fullWidth={false}
                                    disabled={isPending}
                                    />

                                    <MGButton
                                    label='Mensagem'
                                    variant='secondary'
                                    onPress={handleMessage}
                                    fullWidth={false}
                                    />

                                </>
                            ) 
                        }
                        { 
                            canReview && (
                                <>
                                    <MGButton
                                    label='Avaliar'
                                    variant='secondary'
                                    onPress={() => navigation.navigate('ReviewBooking', {
                                        bookingId,
                                        serviceName: data.service_name,
                                        providerName: data.provider_name,
                                    })}
                                    fullWidth={false}
                                    />

                                    <MGButton
                                    label='Mensagem'
                                    variant='secondary'
                                    onPress={handleMessage}
                                    fullWidth={false}
                                    />
                                </>
                            ) 
                        }
                        {
                            hasReview && (
                                <>
                                    <MGButton
                                    label='Ver avaliação'
                                    variant='secondary'
                                    onPress={() => navigation.navigate('ReviewDetail', {
                                        reviewId: data.review_id!,
                                    })}
                                    />
                                </>
                            )
                        }
                    </View>
                </ScrollView>
            )}
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
    serviceName: {
        flex: 1,
        fontSize: typography.sizes.lg,
        fontFamily: fonts.semibold,
    },
    providerName: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginTop: spacing.xs,
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
        fontFamily: fonts.bold,
    },
    actionContainer:{
        display:'flex',
        flexDirection:'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        width: '100%'
    }
})

export default BookingDetail
