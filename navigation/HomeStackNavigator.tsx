import { createStackNavigator } from '@react-navigation/stack'
import { HomeStackParamList } from './types'
import HomeScreen from '../screens/customer/HomeScreen'
import BookServiceScreen from '../screens/customer/BookServiceScreen'
import BookingRequestScreen from '../screens/customer/BookingRequestScreen'
import PetFormScreen from '../screens/customer/PetFormScreen'
import TutorSearchScreen from '../screens/customer/TutorSearchScreen'
import GroomerPublicProfileScreen from '../screens/customer/GroomerPublicProfileScreen'

const Stack = createStackNavigator<HomeStackParamList>()

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name='Home' component={HomeScreen} />
        <Stack.Screen name='TutorSearch' component={TutorSearchScreen} />
        <Stack.Screen name='GroomerProfile' component={GroomerPublicProfileScreen} />
        <Stack.Screen name='BookService' component={BookServiceScreen} />
        <Stack.Screen name='BookingRequest' component={BookingRequestScreen} />
        <Stack.Screen name='PetForm' component={PetFormScreen} />
    </Stack.Navigator>
  )
}