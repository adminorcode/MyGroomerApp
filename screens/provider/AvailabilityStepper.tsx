import { View } from 'react-native'
import MGIcon from '../../design-system/components/MGIcon'
import MGText from '../../design-system/components/MGText'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

const steps = [
  { id: 'registration', label: 'Cadastro' },
  { id: 'services', label: 'Serviços' },
  { id: 'location', label: 'Local' },
  { id: 'availability', label: 'Horários' },
]

export default function AvailabilityStepper() {
  const { colors, spacing } = useMGTheme()
  const currentIndex = steps.length - 1

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Passo ${currentIndex + 1} de ${steps.length}: ${steps[currentIndex].label}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
    >
      {steps.map((step, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        return (
          <View key={step.id} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <View style={{ height: 28, justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center' }}>
              {index > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: '50%',
                    height: 2,
                    backgroundColor: colors.action.primary,
                  }}
                />
              ) : null}
              {index < steps.length - 1 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: '50%',
                    right: 0,
                    height: 2,
                    backgroundColor: colors.action.primary,
                  }}
                />
              ) : null}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.action.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? (
                  <MGIcon name="check" size={16} color={colors.onAction.primary} />
                ) : (
                  <MGText variant="label" style={{ color: colors.onAction.primary }}>{index + 1}</MGText>
                )}
              </View>
            </View>
            <MGText variant="caption" color={current ? 'brand' : 'secondary'} numberOfLines={1}>
              {step.label}
            </MGText>
          </View>
        )
      })}
    </View>
  )
}
