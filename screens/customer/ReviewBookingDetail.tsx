import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { BookingsStackParamList } from '../../navigation/types'
import { useGetReviewById } from '../../hooks/useReviews'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import StarRating from '../../components/shared/StarRating'
import { MGAvatar, MGCard, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import MGArtwork from '../../design-system/components/MGArtwork'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { fonts, spacing, typography } from '../../constants/theme'

type ReviewDetailNavigationProp = StackNavigationProp<BookingsStackParamList, 'ReviewDetail'>
type ReviewDetailRouteProp = RouteProp<BookingsStackParamList, 'ReviewDetail'>

type Props = {
  navigation: ReviewDetailNavigationProp
  route: ReviewDetailRouteProp
}

function formatDate(value?: string | Date) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  return date.toLocaleString('pt-BR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const ReviewBookingDetail = ({ navigation, route }: Props) => {
  const { colors, radius } = useMGTheme()
  const { reviewId, providerName } = route.params
  const { data, isLoading, isError, refetch } = useGetReviewById(reviewId)

  return (
    <ScreenContainer>
      <ScreenHeader
        title='Sua avaliação'
        description='O que você registrou neste atendimento'
        showBackButton
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel="Carregando avaliação" size='large' color={colors.action.primary} />
          <MGText variant="body" color="secondary" style={styles.stateText}>Carregando sua avaliação...</MGText>
        </View>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <MGErrorState message="Não foi possível carregar esta avaliação." onRetry={() => { void refetch() }} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cartão 16 pt com borda 1 pt (escala de forma). Estrelas em action.primary (R1). */}
          <MGCard padding={spacing.lg} style={styles.card}>
            <MGArtwork name="paw-decoration" width={32} height={32} style={{ position: 'absolute', top: spacing.sm, right: spacing.xs }} />
            <View style={styles.ratingSection}>
              {/* R3: avatar do profissional em teal. Sem nome da rota, a seção segue sem avatar. */}
              {providerName ? <MGAvatar name={providerName} tone='teal' size={48} /> : null}
              <StarRating rating={data.rating} size={36} readOnly />
              <Text style={[styles.ratingValue, { color: colors.text.primary, backgroundColor: colors.surface.tealSubtle, borderRadius: radius.pill }]}>
                {data.rating} de 5
              </Text>
            </View>

            {data.comment ? (
              <Text style={[styles.comment, { color: colors.text.primary }]}>{data.comment}</Text>
            ) : (
              <Text style={[styles.comment, { color: colors.text.secondary }]}>
                Nenhum comentário foi deixado.
              </Text>
            )}

            <View style={styles.dateRow}>
              <MGIcon name="calendar-days" size={18} color={colors.brand.teal} />
              <Text style={[styles.date, { color: colors.text.secondary, flex: 1 }]}>
                Avaliado em {formatDate(data.created_at)}
              </Text>
            </View>
          </MGCard>
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  stateText: {
    textAlign: 'center',
  },
  card: {
    gap: spacing.lg,
  },
  ratingSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingValue: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
  },
  comment: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  date: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
  },
})

export default ReviewBookingDetail
