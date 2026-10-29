import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { BookingsStackParamList } from '../../navigation/types'
import { useGetReviewById } from '../../hooks/useReviews'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import StarRating from '../../components/shared/StarRating'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

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
  const { colors } = useTheme()
  const { reviewId } = route.params
  const { data, isLoading, isError } = useGetReviewById(reviewId)

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
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.error }]}>
            Não foi possível carregar esta avaliação.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ratingSection}>
              <StarRating rating={data.rating} size={36} readOnly />
              <Text style={[styles.ratingValue, { color: colors.textSecondary }]}>
                {data.rating} de 5
              </Text>
            </View>

            {data.comment ? (
              <Text style={[styles.comment, { color: colors.text }]}>{data.comment}</Text>
            ) : (
              <Text style={[styles.comment, { color: colors.textSecondary }]}>
                Nenhum comentário foi deixado.
              </Text>
            )}

            <Text style={[styles.date, { color: colors.textSecondary }]}>
              Avaliado em {formatDate(data.created_at)}
            </Text>
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
  message: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.lg,
  },
  ratingSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingValue: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
  },
  comment: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    lineHeight: 22,
  },
  date: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
  },
})

export default ReviewBookingDetail
