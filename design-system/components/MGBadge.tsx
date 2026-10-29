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
    pending: { color: colors.action.primaryOutline, background: colors.surface.pinkSubtle },
    confirmed: { color: colors.feedback.success, background: colors.feedback.successSurface },
    info: { color: colors.feedback.info, background: colors.feedback.infoSurface },
    success: { color: colors.feedback.success, background: colors.feedback.successSurface },
    warning: { color: colors.feedback.warning, background: colors.feedback.warningSurface },
    error: { color: colors.feedback.error, background: colors.feedback.errorSurface },
    neutral: { color: colors.text.secondary, background: colors.state.disabledSurface },
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
        },
      ]}
    >
      {icon}
      <MGText variant="caption" style={{ color }}>
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
