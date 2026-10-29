import { createStackNavigator } from "@react-navigation/stack";
import ProfileScreen from "../screens/customer/ProfileScreen";
import BecomeAProvider from "../screens/customer/BecomeAProvider";
import PetsScreen from "../screens/customer/PetsScreen";
import PetFormScreen from "../screens/customer/PetFormScreen";
import { ProfileStackParamList } from "./types";


const Stack = createStackNavigator<ProfileStackParamList>()

export function ProfileStackNavigator (){
    return(
        <Stack.Navigator screenOptions={{headerShown:false}}>
            <Stack.Screen name="Profile" component={ProfileScreen}/>
            <Stack.Screen name="BecomeAProvider" component={BecomeAProvider} />
            <Stack.Screen name="Pets" component={PetsScreen} />
            <Stack.Screen name="PetForm" component={PetFormScreen} />
        </Stack.Navigator>
    )
}