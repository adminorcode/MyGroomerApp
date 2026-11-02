import { createStackNavigator } from "@react-navigation/stack";
import ProfileScreen from "../screens/customer/ProfileScreen";
import BecomeAProvider from "../screens/customer/BecomeAProvider";
import PetsScreen from "../screens/customer/PetsScreen";
import PetFormScreen from "../screens/customer/PetFormScreen";
import DesignSystemShowcaseScreen from "../screens/dev/DesignSystemShowcaseScreen";
import PublicProfileScreen from "../screens/provider/PublicProfileScreen";
import PublicProfilePreviewScreen from "../screens/provider/PublicProfilePreviewScreen";
import ServiceMenuScreen from "../screens/provider/ServiceMenuScreen";
import ServiceOfferEditorScreen from "../screens/provider/ServiceOfferEditorScreen";
import ServiceLocationScreen from "../screens/provider/ServiceLocationScreen";
import WeeklyAvailabilityScreen from "../screens/provider/WeeklyAvailabilityScreen";
import { ServiceMenuDraftProvider } from "../screens/provider/ServiceMenuDraft";
import { ProfileStackParamList } from "./types";


const Stack = createStackNavigator<ProfileStackParamList>()

export function ProfileStackNavigator (){
    return(
        <ServiceMenuDraftProvider>
            <Stack.Navigator screenOptions={{headerShown:false}}>
                <Stack.Screen name="Profile" component={ProfileScreen}/>
                <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
                <Stack.Screen name="PublicProfilePreview" component={PublicProfilePreviewScreen} />
                <Stack.Screen name="ServiceMenu" component={ServiceMenuScreen} />
                <Stack.Screen name="ServiceOfferEditor" component={ServiceOfferEditorScreen} />
                <Stack.Screen name="ServiceLocation" component={ServiceLocationScreen} />
                <Stack.Screen name="WeeklyAvailability" component={WeeklyAvailabilityScreen} />
                <Stack.Screen name="BecomeAProvider" component={BecomeAProvider} />
                <Stack.Screen name="Pets" component={PetsScreen} />
                <Stack.Screen name="PetForm" component={PetFormScreen} />
                <Stack.Screen name="DesignSystemShowcase" component={DesignSystemShowcaseScreen} />
            </Stack.Navigator>
        </ServiceMenuDraftProvider>
    )
}
