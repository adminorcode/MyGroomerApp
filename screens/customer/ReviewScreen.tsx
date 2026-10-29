import { AppAlert } from '../../utils/alert'
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'
import { useCreateReviews } from '../../hooks/useReviews'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { BookingsStackParamList } from '../../navigation/types'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import StarRating from '../../components/shared/StarRating'
import BoameBtn from '../../components/shared/BoameBtn'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

type ReviewScreenNavigationProps = StackNavigationProp<BookingsStackParamList, 'ReviewBooking'>
type ReviewScreenRouteProps = RouteProp<BookingsStackParamList, 'ReviewBooking'>

type Props = {
  navigation: ReviewScreenNavigationProps
  route: ReviewScreenRouteProps
}

const ReviewScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme()
  const { bookingId, serviceName, providerName } = route.params
  const { mutateAsync, isPending } = useCreateReviews()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const contextText = serviceName
    ? `How was your ${serviceName}${providerName ? ` with ${providerName}` : ''}?`
    : 'How was your experience?'

  const handleSubmit = async () => {
    if (rating <= 0) {
      AppAlert.alert('Rating required', 'Please tap at least one star to rate your experience.')
      return
    }
    if (!comment.trim()) {
      AppAlert.alert('Comment required', 'Please share a few words about your experience.')
      return
    }

    try {
      await mutateAsync({ booking_id: bookingId, rating, comment: comment.trim() })
      navigation.goBack()
    } catch (error) {
      AppAlert.alert('Could not submit', 'Something went wrong while submitting your review. Please try again.')
      console.error(error)
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title='Leave a Review'
          description='Share your experience to help others'
          showBackButton
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* Rating — focal point */}
          <View style={styles.ratingSection}>
            <Text style={[styles.ratingLabel, { color: colors.text }]}>{contextText}</Text>
            <View style={styles.starsWrapper}>
              <StarRating rating={rating} onRatingChange={setRating} size={40} />
            </View>
          </View>

          {/* Comment */}
          <Text style={[styles.label, { color: colors.text }]}>Your review</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder='Tell others what stood out...'
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical='top'
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
          />
        </ScrollView>

        <BoameBtn
          title='Submit Review'
          onPress={handleSubmit}
          loading={isPending}
          disabled={isPending}
          style={styles.submitButton}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  ratingSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.lg,
  },
  ratingLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
    textAlign: 'center',
  },
  starsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.medium,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
  },
  submitButton: {
    marginBottom: spacing.lg,
  },
})

export default ReviewScreen

