import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import MGButton from './MGButton'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  title: string
  description?: string
  illustration?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export default function MGEmptyState({
  title,
  description,
  illustration,
  actionLabel,
  onAction,
}: Props) {
  const { spacing } = useMGTheme()

  return (
    <View style={[styles.wrap, { gap: spacing.md, padding: spacing.base }]}>
      {illustration}
      <MGText variant="heading3" style={styles.center}>
        {title}
      </MGText>
      {description ? (
        <MGText variant="body" color="secondary" style={styles.center}>
          {description}
        </MGText>
      ) : null}
      {actionLabel && onAction ? (
        <MGButton label={actionLabel} onPress={onAction} fullWidth={false} style={{ alignSelf: 'center', paddingHorizontal: spacing.xl }} />
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
