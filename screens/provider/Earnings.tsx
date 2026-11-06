import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import { ArrowDownLeft } from 'lucide-react-native'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import TransactionStatusBadge from '../../components/shared/TransactionStatusBadge'
import { MGCard, MGEmptyState, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import { useTheme } from '../../context/ThemeContext'
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
  const { colors } = useTheme()
  const { data, isLoading, isError, refetch } = useGetProviderEarnings()

  const renderSummary = () => (
    <MGCard style={{ marginBottom: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total recebido</Text>
        <Text style={[styles.summaryValue, { color: colors.secondary }]}>
          {formatMoney(data?.totalEarned ?? 0)}
        </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pendente</Text>
        <Text style={[styles.summaryLabel, { color: colors.primaryText, backgroundColor: colors.selectionSoft, borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
          {formatMoney(data?.pending ?? 0)}
        </Text>
      </View>
      </View>
    </MGCard>
  )

  const renderTransaction = ({ item }: { item: ProviderTransaction }) => (
    <MGCard style={{ marginBottom: spacing.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={[styles.txIcon, { backgroundColor: colors.selectionSoft }]}>
        <ArrowDownLeft size={20} color={colors.primary} />
      </View>

      <View style={styles.txContent}>
        <View style={styles.txHeader}>
          <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
            {item.service_name ?? 'Repasse'}
          </Text>
          <Text style={[styles.txAmount, { color: colors.text }]} numberOfLines={1}>
            {formatMoney(item.amount)}
          </Text>
        </View>

        <Text style={[styles.txSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.customer_name ? `De ${item.customer_name}` : 'Tutor'} · {formatDate(item.created_at)}
        </Text>

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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MGErrorState message="Não foi possível carregar os rendimentos." onRetry={() => { void refetch() }} />
        </View>
      ) : (
        <>
          {renderSummary()}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <MGIcon name="file-text" color={colors.primary} size={20} />
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
  summaryLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
  },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.bold,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
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
    fontSize: typography.sizes.md,
    fontFamily: fonts.semibold,
  },
  txAmount: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.bold,
  },
  txSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
})
