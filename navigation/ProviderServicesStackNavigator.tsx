import { createStackNavigator } from '@react-navigation/stack'
import { ProviderServicesStackParamList } from './types'
import ServiceMenuScreen from '../screens/provider/ServiceMenuScreen'
import ServiceOfferEditorScreen from '../screens/provider/ServiceOfferEditorScreen'
import { ProfessionalRegistrationStepScreen } from '../screens/provider/OnboardingLandmarkScreen'
import ServiceLocationScreen from '../screens/provider/ServiceLocationScreen'
import WeeklyAvailabilityScreen from '../screens/provider/WeeklyAvailabilityScreen'
import { ServiceMenuDraftProvider } from '../screens/provider/ServiceMenuDraft'

const Stack = createStackNavigator<ProviderServicesStackParamList>()

export default function ProviderServicesStackNavigator() {
  return (
    <ServiceMenuDraftProvider>
      <Stack.Navigator initialRouteName="ServiceMenu" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfessionalRegistration" component={ProfessionalRegistrationStepScreen} />
        <Stack.Screen name="ServiceMenu" component={ServiceMenuScreen} />
        <Stack.Screen name="ServiceLocation" component={ServiceLocationScreen} />
        <Stack.Screen name="WeeklyAvailability" component={WeeklyAvailabilityScreen} />
        <Stack.Screen name="ServiceOfferEditor" component={ServiceOfferEditorScreen} />
      </Stack.Navigator>
    </ServiceMenuDraftProvider>
  )
}
