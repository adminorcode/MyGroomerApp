import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type MGBadgeTone =
  | 'pending'
  | 'confirmed'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'

type Props = {
  label: string
  tone?: MGBadgeTone
  icon?: ReactNode
}

export default function MGBadge({ label, tone = 'neutral', icon }: Props) {
  const { colors, spacing, radius } = useMGTheme()

  const toneStyles: Record<MGBadgeTone, { color: string; background: string }> = {
    // R6: status usa semântica de feedback com texto; a cor da marca não codifica status.
    pending: { color: colors.feedback.warning, background: colors.feedback.warningSurface },
    confirmed: { color: colors.feedback.success, background: colors.feedback.successSurface },
    info: { color: colors.text.primary, background: colors.feedback.infoSurface },
    success: { color: colors.feedback.success, background: colors.feedback.successSurface },
    warning: { color: colors.feedback.warning, background: colors.feedback.warningSurface },
    error: { color: colors.feedback.error, background: colors.feedback.errorSurface },
    neutral: { color: colors.text.primary, background: colors.state.disabledSurface },
  }

  const { color, background } = toneStyles[tone]

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: background,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.lg,
          columnGap: spacing.xs,
          maxWidth: '100%',
          flexShrink: 1,
        },
      ]}
    >
      {icon}
      <MGText variant="caption" style={{ color, flexShrink: 1 }}>
        {label}
      </MGText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
})
