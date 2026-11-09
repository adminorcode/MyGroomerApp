import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import { ArrowDownLeft } from 'lucide-react-native'
import { spacing } from '../../design-system/tokens'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import TransactionStatusBadge from '../../components/shared/TransactionStatusBadge'
import { MGBadge, MGCard, MGEmptyState, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useGetProviderEarnings } from '../../hooks/useProviders'
import { ProviderTransaction } from '../../types/transaction.types'
import { formatMoney } from '../../utils/formatMoney'

function formatDate(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Earnings() {
  // Rendimentos é superfície do profissional: valor e ícones em teal (R3).
  const { colors, radius } = useMGTheme()
  const { data, isLoading, isError, refetch } = useGetProviderEarnings()

  const renderSummary = () => (
    <MGCard shape="hero" style={styles.summary}>
      <MGText variant="label" color="secondary">Total recebido</MGText>
      <MGText variant="numeric" color="teal">
        {formatMoney(data?.totalEarned ?? 0)}
      </MGText>
      {/* R6: pendente é status de alerta com texto, não saldo disponível para saque. */}
      <View style={styles.pendingRow}>
        <MGBadge label="Pendente" tone="pending" />
        <View>
          <MGText variant="caption" color="secondary">Valor pendente</MGText>
          <MGText variant="title" color="primary">
            {formatMoney(data?.pending ?? 0)}
          </MGText>
        </View>
      </View>
    </MGCard>
  )

  const renderTransaction = ({ item }: { item: ProviderTransaction }) => (
    <MGCard style={styles.transaction}>
      <View style={styles.transactionRow}>
        <View style={[styles.txIcon, { backgroundColor: colors.surface.tealSubtle, borderRadius: radius.pill }]}>
          <ArrowDownLeft size={20} color={colors.brand.teal} />
        </View>

        <View style={styles.txContent}>
          <View style={styles.txHeader}>
            <MGText variant="title" color="primary" numberOfLines={2} style={styles.txTitle}>
              {item.service_name ?? 'Repasse'}
            </MGText>
            <MGText variant="title" color="teal" numberOfLines={1}>
              {formatMoney(item.amount)}
            </MGText>
          </View>

          {/* Data inteira visível: quebra em duas linhas em vez de reticências no meio da data. */}
          <MGText variant="bodySmall" color="secondary" numberOfLines={2}>
            {item.customer_name ? `De ${item.customer_name}` : 'Tutor'} · {formatDate(item.created_at)}
          </MGText>

          <TransactionStatusBadge status={item.transaction_status} />
        </View>
      </View>
    </MGCard>
  )

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Rendimentos"
        description="Acompanhe repasses e saldo pendente"
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel="Carregando rendimentos" size="large" color={colors.brand.teal} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MGErrorState message="Não foi possível carregar os rendimentos." onRetry={() => { void refetch() }} />
        </View>
      ) : (
        <>
          {renderSummary()}
          <View style={styles.sectionHeader}>
            <MGIcon name="file-text" color={colors.brand.teal} size={20} />
            <MGText variant="title">Histórico de repasses</MGText>
          </View>
          <FlatList
            data={data?.transactions ?? []}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={renderTransaction}
            ListEmptyComponent={
              <View style={styles.centered}>
                <MGEmptyState
                  title="Nenhum repasse"
                  description="Nenhum repasse ainda. Atendimentos concluídos aparecem aqui."
                />
              </View>
            }
            keyExtractor={(item) => item.id}
          />
        </>
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
  summary: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  transaction: {
    marginBottom: spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  txIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: {
    flex: 1,
    gap: spacing.xs,
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  txTitle: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
})
