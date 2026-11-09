import { AppAlert } from '../../utils/alert'
import { useState } from 'react'
import {
  View,
  Text,
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
import { MGButton, MGIcon, MGText, MGTextField } from '../../design-system/components'
import MGArtwork from '../../design-system/components/MGArtwork'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { fonts, spacing, typography } from '../../constants/theme'

type ReviewScreenNavigationProps = StackNavigationProp<BookingsStackParamList, 'ReviewBooking'>
type ReviewScreenRouteProps = RouteProp<BookingsStackParamList, 'ReviewBooking'>

type Props = {
  navigation: ReviewScreenNavigationProps
  route: ReviewScreenRouteProps
}

const ReviewScreen = ({ navigation, route }: Props) => {
  const { colors, radius } = useMGTheme()
  const { bookingId, serviceName, providerName } = route.params
  const { mutateAsync, isPending } = useCreateReviews()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  // Mesmos textos dos alertas, visíveis na tela: o erro não depende de diálogo do sistema.
  const [formError, setFormError] = useState<string | null>(null)

  const contextText = serviceName
    ? `Como foi ${serviceName}${providerName ? ` com ${providerName}` : ''}?`
    : 'Como foi sua experiência?'

  const handleSubmit = async () => {
    setFormError(null)
    if (rating <= 0) {
      const message = 'Toque em pelo menos uma estrela para avaliar.'
      setFormError(message)
      AppAlert.alert('Nota obrigatória', message)
      return
    }
    if (!comment.trim()) {
      const message = 'Conte em poucas palavras como foi o atendimento.'
      setFormError(message)
      AppAlert.alert('Comentário obrigatório', message)
      return
    }

    try {
      await mutateAsync({ booking_id: bookingId, rating, comment: comment.trim() })
      navigation.goBack()
    } catch (error) {
      const message = 'Algo deu errado ao enviar a avaliação. Tente novamente.'
      setFormError(message)
      AppAlert.alert('Não foi possível enviar', message)
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
          title='Avaliar atendimento'
          description='Conte como foi para ajudar outros tutores'
          showBackButton
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* Rating — focal point. R2: ilustração e pet em bloco rosa. */}
          <View style={styles.ratingSection}>
            <View style={[styles.illustration, { backgroundColor: colors.surface.pinkSubtle, borderRadius: radius.xl }]}>
              <MGArtwork name="puppy" width={116} height={116} />
              <View style={styles.bathIcon}><MGIcon name="bath" size={32} color={colors.action.primary} /></View>
            </View>
            <Text style={[styles.ratingLabel, { color: colors.text.primary }]}>{contextText}</Text>
            <View style={styles.starsWrapper}>
              <StarRating rating={rating} onRatingChange={value => { setRating(value); setFormError(null) }} size={40} />
            </View>
          </View>

          {/* Comment */}
          <MGTextField
            label="Sua avaliação"
            accessibilityLabel="Sua avaliação"
            value={comment}
            onChangeText={text => { setComment(text); setFormError(null) }}
            placeholder='Conte o que mais chamou atenção...'
            multiline
            numberOfLines={5}
            textAlignVertical='top'
            style={styles.input}
          />
        </ScrollView>

        {/* Fora da rolagem: o erro fica sempre acima do CTA, com respiro, em qualquer posição de rolagem. */}
        {formError ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={styles.formError}>{formError}</MGText>
        ) : null}

        <MGButton
          label='Enviar avaliação'
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
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  illustration: { width: 152, height: 136, alignItems: 'center', justifyContent: 'center' },
  bathIcon: { position: 'absolute', bottom: 0, right: spacing.sm },
  ratingLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
    textAlign: 'center',
  },
  starsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 120,
  },
  formError: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.lg,
  },
})

export default ReviewScreen
