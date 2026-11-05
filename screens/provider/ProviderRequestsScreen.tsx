import { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProviderRequestsStackParamList } from '../../navigation/types'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { MGCard, MGEmptyState, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import { RequestCard } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { RequestResponse, useProviderRequests, useRespondToRequest } from '../../hooks/useRequests'
import { RequestGroupFilter } from '../../types/request.types'
import { getErrorMessage } from '../../utils/error'
import RequestGroupTabs from './RequestGroupTabs'
import { EMPTY_COPY, pendingTodayHint, pendingTodayTitle, requestDateLabel } from './requestsModel'

type Props = {
  navigation: StackNavigationProp<ProviderRequestsStackParamList, 'ProviderRequests'>
}

export default function ProviderRequestsScreen({ navigation }: Props) {
  const { colors, spacing } = useMGTheme()
  const [group, setGroup] = useState<RequestGroupFilter>('pending')
  const [actionError, setActionError] = useState<string | null>(null)
  const requests = useProviderRequests(group)
  const respond = useRespondToRequest()
  // A aba continua montada ao trocar de aba do rodapé: refaz a consulta cada vez que ela volta ao foco.
  const refetch = requests.refetch
  const firstFocus = useRef(true)
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) {
      firstFocus.current = false
      return
    }
    void refetch()
  }, [refetch]))
  const list = requests.data?.requests ?? []
  const loading = requests.isLoading || (requests.isFetching && !requests.data)
  // O aviso não depende da aba: mantém o último número enquanto a aba nova carrega.
  const lastCount = useRef<number | undefined>(undefined)
  if (requests.data) lastCount.current = requests.data.pending_today_count
  const pendingToday = requests.data?.pending_today_count ?? lastCount.current

  const answer = async (bookingId: string, response: RequestResponse) => {
    setActionError(null)
    try {
      await respond.mutateAsync({ bookingId, response })
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  const changeGroup = (next: RequestGroupFilter) => {
    setActionError(null)
    setGroup(next)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.canvas, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, paddingHorizontal: spacing.base, paddingTop: spacing.md }}>
        <MGText variant="heading2" accessibilityRole="header" style={{ marginBottom: spacing.md }}>Solicitações recebidas</MGText>
        <View style={{ marginBottom: spacing.md }}>
          <RequestGroupTabs value={group} onChange={changeGroup} />
        </View>

        {pendingToday !== undefined ? (
          <View accessible accessibilityLabel={pendingTodayTitle(pendingToday)} style={{ marginBottom: spacing.md }}>
            <MGCard variant="teal" padding={spacing.md}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <MGIcon name="bell" size={32} color={colors.action.secondary} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <MGText variant="title">{pendingTodayTitle(pendingToday)}</MGText>
                  <MGText variant="bodySmall" color="secondary">{pendingTodayHint(pendingToday)}</MGText>
                </View>
              </View>
            </MGCard>
          </View>
        ) : null}

        {actionError ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={{ marginBottom: spacing.md }}>
            {actionError}
          </MGText>
        ) : null}

        {requests.isError && requests.data ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={{ marginBottom: spacing.md }}>
            Não foi possível atualizar a lista. Os pedidos abaixo podem estar desatualizados.
          </MGText>
        ) : null}

        {loading ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Carregando solicitações" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.action.primary} />
          </View>
        ) : requests.isError && !requests.data ? (
          <MGErrorState message="Não foi possível carregar as solicitações." onRetry={() => { void requests.refetch() }} />
        ) : list.length === 0 ? (
          <MGEmptyState title="Nenhuma solicitação" description={EMPTY_COPY[group]} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
            {list.map(item => (
              <RequestCard
                key={item.id}
                group={item.group}
                petName={item.pet_name}
                customerName={item.customer_name}
                serviceName={item.service_name}
                scheduledAtLabel={requestDateLabel(item.scheduled_at)}
                location={item.customer_location}
                price={item.price}
                blocked={respond.isPending}
                responding={respond.isPending && respond.variables?.bookingId === item.id ? respond.variables.response : null}
                onAccept={() => { void answer(item.id, 'accept') }}
                onReject={() => { void answer(item.id, 'reject') }}
                onPress={() => navigation.navigate('ProviderBookingDetail', { bookingId: item.id })}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  )
}
