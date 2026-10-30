import { createStackNavigator } from '@react-navigation/stack'
import { ProviderServicesStackParamList } from './types'
import ServiceMenuScreen from '../screens/provider/ServiceMenuScreen'
import ServiceOfferEditorScreen from '../screens/provider/ServiceOfferEditorScreen'
import { ProfessionalRegistrationStepScreen, ServiceLocationStepScreen } from '../screens/provider/OnboardingLandmarkScreen'
import { ServiceMenuDraftProvider } from '../screens/provider/ServiceMenuDraft'

const Stack = createStackNavigator<ProviderServicesStackParamList>()

export default function ProviderServicesStackNavigator() {
  return (
    <ServiceMenuDraftProvider>
      <Stack.Navigator initialRouteName="ServiceMenu" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfessionalRegistration" component={ProfessionalRegistrationStepScreen} />
        <Stack.Screen name="ServiceMenu" component={ServiceMenuScreen} />
        <Stack.Screen name="ServiceLocation" component={ServiceLocationStepScreen} />
        <Stack.Screen name="ServiceOfferEditor" component={ServiceOfferEditorScreen} />
      </Stack.Navigator>
    </ServiceMenuDraftProvider>
  )
}
