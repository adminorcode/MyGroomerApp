import { StyleSheet, View } from 'react-native'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type OnboardingStep = {
  id: string
  label: string
}

type Props = {
  steps: OnboardingStep[]
  currentStepId: string
}

export default function OnboardingStepper({ steps, currentStepId }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStepId),
  )

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Passo ${currentIndex + 1} de ${steps.length}: ${steps[currentIndex]?.label ?? ''}`}
      style={[styles.row, { gap: spacing.sm }]}
    >
      {steps.map((step, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        const tone = done || current ? colors.action.primary : colors.border.default
        return (
          <View key={step.id} style={[styles.step, { gap: spacing.xs, flex: 1 }]}>
            <View
              style={{
                height: 4,
                borderRadius: radius.pill,
                backgroundColor: tone,
              }}
            />
            <MGText
              variant="caption"
              color={current ? 'brand' : 'secondary'}
              numberOfLines={1}
            >
              {step.label}
            </MGText>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {},
})
