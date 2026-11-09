import { AppAlert } from '../../utils/alert'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { CompositeNavigationProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { BookingsStackParamList, RootParamList } from '../../navigation/types'
import { useChangeBookingStatus, useGetBookingById } from '../../hooks/useBooking'
import { CalendarClock, Hash, MapPin, Clock, PawPrint } from 'lucide-react-native'
import { petSizeLabel, petSpeciesLabel } from '../../types/pet.types'
import { DetailRow } from '../../components/shared/DetailRow'
import { MGAvatar, MGButton, MGCard, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { radius, spacing } from '../../design-system/tokens'
import BookingStatusBadge from '../../design-system/patterns/BookingStatusBadge'
import BookingSummary from '../../design-system/patterns/BookingSummary'
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
    const { colors } = useMGTheme()
    const runtime = useRuntime()
    const { data, isLoading, isError, refetch } = useGetBookingById(bookingId)
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
            <ScreenHeader title="Detalhe do agendamento" showBackButton onBack={() => navigation.goBack()} />
            <View style={styles.centered}>
                <ActivityIndicator accessibilityLabel="Carregando agendamento" size="large" color={colors.action.primary} />
                <MGText>Carregando agendamento</MGText>
            </View>
        </ScreenContainer>
        )
    }

    if (isError || !data) {
        return (
            <ScreenContainer>
                <ScreenHeader title="Detalhe do agendamento" showBackButton onBack={() => navigation.goBack()} />
                <MGErrorState message="Não foi possível carregar este agendamento." onRetry={() => { void refetch() }} />
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
                    {/* Cabeçalho: serviço, status e profissional (R3: avatar do profissional em teal) */}
                    <MGCard style={styles.block}>
                        <View style={styles.headerRow}>
                            <View style={[styles.serviceIcon, { backgroundColor: colors.surface.pinkSubtle }]}>
                                <MGIcon name={/banho/i.test(data.service_name) ? 'bath' : /tosa/i.test(data.service_name) ? 'scissors' : 'paw-print'} size={28} color={colors.brand.pink} />
                            </View>
                            <View style={styles.headerText}>
                                <View style={styles.titleRow}>
                                    <MGText variant="heading3" style={styles.serviceName}>
                                        {data.service_name}
                                    </MGText>
                                    <BookingStatusBadge status={data.booking_status} />
                                </View>
                                <View style={styles.providerRow}>
                                    <MGAvatar name={data.provider_name} tone="teal" size={28} />
                                    <MGText variant="bodySmall" color="secondary" style={styles.flex}>
                                        {`por ${data.provider_name}`}
                                    </MGText>
                                </View>
                            </View>
                        </View>
                    </MGCard>

                    {/* CMP-08 / R7 / AC-06: valor do atendimento em bilhete (só no detalhe do agendamento) */}
                    <View style={styles.block}>
                        <BookingSummary
                            title="Pagamento"
                            rows={[]}
                            totalLabel="Valor estimado"
                            totalValue={formatMoney(data.price)}
                            ticket
                        />
                    </View>

                    {/* Details */}
                    <MGCard style={styles.block}>
                        <DetailRow
                            icon={<CalendarClock size={18} color={colors.text.secondary} />}
                            label="Agendado"
                            value={formatDateTime(data.scheduled_at)}
                        />
                        <DetailRow
                            icon={<MapPin size={18} color={colors.brand.teal} />}
                            label="Local"
                            value={data.customer_location}
                        />
                        {data.pet_name ? (
                            <DetailRow
                                icon={<PawPrint size={18} color={colors.brand.pink} />}
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
                            icon={<Hash size={18} color={colors.text.secondary} />}
                            label="Referência"
                            value={`#${data.id.slice(0, 8).toUpperCase()}`}
                        />
                        <DetailRow
                            icon={<Clock size={18} color={colors.text.secondary} />}
                            label="Solicitado em"
                            value={formatDateTime(data.created_at)}
                            isLast
                        />
                    </MGCard>

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
                                        providerName: data.provider_name,
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
        gap: spacing.sm,
    },
    block: {
        marginBottom: spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    serviceIcon: {
        width: 52,
        height: 52,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        minWidth: 0,
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
        marginTop: spacing.xs,
    },
    flex: {
        flex: 1,
    },
    actionContainer:{
        display:'flex',
        flexDirection:'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        width: '100%'
    }
})

export default BookingDetail
