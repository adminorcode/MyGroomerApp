import { View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGScreen, MGText } from '../../design-system/components'
import { OnboardingStepper } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { ProviderServicesStackParamList } from '../../navigation/types'

const steps = [
  { id: 'registration', label: 'Cadastro' },
  { id: 'services', label: 'Serviços' },
  { id: 'location', label: 'Local' },
]

type RegistrationProps = {
  navigation: StackNavigationProp<ProviderServicesStackParamList, 'ProfessionalRegistration'>
}

export function ProfessionalRegistrationStepScreen({ navigation }: RegistrationProps) {
  const { spacing } = useMGTheme()
  return (
    <MGScreen
      safeArea={false}
      footer={<MGButton label="Continuar" onPress={() => navigation.goBack()} />}
    >
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <OnboardingStepper steps={steps} currentStepId="registration" />
        <MGText variant="heading2">Cadastro profissional</MGText>
        <MGText variant="body" color="secondary">
          Os dados da conta e os tipos de atuação ficam neste passo.
        </MGText>
      </View>
    </MGScreen>
  )
}
