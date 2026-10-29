import { StyleSheet, View } from 'react-native'
import MGButton from './MGButton'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export default function MGErrorState({
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
}: Props) {
  const { spacing } = useMGTheme()

  return (
    <View style={[styles.wrap, { gap: spacing.md, padding: spacing.base }]}>
      <MGText variant="heading3" color="error" style={styles.center}>
        Algo deu errado
      </MGText>
      <MGText variant="body" color="secondary" style={styles.center}>
        {message}
      </MGText>
      {onRetry ? (
        <MGButton
          label={retryLabel}
          variant="secondary"
          onPress={onRetry}
          fullWidth={false}
          style={{ alignSelf: 'center', paddingHorizontal: spacing.xl }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
})
