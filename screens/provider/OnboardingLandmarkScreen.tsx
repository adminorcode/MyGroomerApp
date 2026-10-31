import { StackNavigationProp } from '@react-navigation/stack'
import { useQueryClient } from '@tanstack/react-query'
import { ProviderServicesStackParamList } from '../../navigation/types'
import ProfessionalRegistrationForm from './ProfessionalRegistrationForm'
import { saveProfessionalRegistration } from '../../services/professionalRegistration.service'
import { ProfessionalRegistration } from './professionalRegistrationModel'
import { useAuthStore } from '../../store/authStore'
import { useServiceMenuDraft } from './ServiceMenuDraft'
import { getProviderMenu } from '../../services/provider.service'
import { useRegistrationNavigation } from '../../store/registrationNavigation'

type RegistrationProps = { navigation: StackNavigationProp<ProviderServicesStackParamList, 'ProfessionalRegistration'> }

export function ProfessionalRegistrationStepScreen({ navigation }: RegistrationProps) {
  const queryClient = useQueryClient()
  const menuDraft = useServiceMenuDraft()
  const continueRegistration = async (value: ProfessionalRegistration) => {
    const saved = await saveProfessionalRegistration(value, 'continue')
    const auth = useAuthStore.getState()
    if (auth.token && auth.user) auth.setAuth(auth.token, { ...auth.user, name: saved.name, email: saved.email })
    queryClient.setQueryData(['professional-registration', useAuthStore.getState().user?.id], saved)
    await queryClient.invalidateQueries({ queryKey: ['provider-menu'] })
    const menu = await getProviderMenu()
    // Refresh the available professions while preserving edits made in the service step.
    menuDraft.refreshTypes(menu.data.types)
    navigation.navigate('ServiceMenu')
  }
  return <ProfessionalRegistrationForm authenticated onBack={() => navigation.goBack()} onExit={() => {
    useRegistrationNavigation.getState().setUserId(null)
    navigation.getParent()?.navigate('BookingsTab')
  }} onContinue={continueRegistration} />
}
