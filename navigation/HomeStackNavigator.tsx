import { createStackNavigator } from '@react-navigation/stack'
import { HomeStackParamList } from './types'
import HomeScreen from '../screens/customer/HomeScreen'
import ServiceProvidersScreen from '../screens/customer/ServiceProvidersScreen'
import BookServiceScreen from '../screens/customer/BookServiceScreen'
import ServiceScreen from '../screens/customer/ServiceScreen'
import PetFormScreen from '../screens/customer/PetFormScreen'

const Stack = createStackNavigator<HomeStackParamList>()

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name='Home' component={HomeScreen} />
        <Stack.Screen name='Services' component={ServiceScreen} />
        <Stack.Screen name='ServiceProviders' component={ServiceProvidersScreen} />
        <Stack.Screen name='BookService' component={BookServiceScreen} />
        <Stack.Screen name='PetForm' component={PetFormScreen} />
    </Stack.Navigator>
  )
}