import { createStackNavigator } from '@react-navigation/stack'
import ProviderBookingDetailScreen from '../screens/provider/ProviderBookingDetailScreen'
import ProviderRequestProfileScreen from '../screens/provider/ProviderRequestProfileScreen'
import ProviderRequestsScreen from '../screens/provider/ProviderRequestsScreen'
import { ProviderRequestsStackParamList } from './types'

const Stack = createStackNavigator<ProviderRequestsStackParamList>()

export default function ProviderRequestsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderRequests" component={ProviderRequestsScreen} />
      <Stack.Screen name="ProviderRequestProfile" component={ProviderRequestProfileScreen} />
      <Stack.Screen name="ProviderBookingDetail" component={ProviderBookingDetailScreen} />
    </Stack.Navigator>
  )
}
