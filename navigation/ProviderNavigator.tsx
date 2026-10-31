import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LayoutDashboardIcon, Wallet, Wrench } from 'lucide-react-native'
import { useTheme } from '../context/ThemeContext'
import { fonts } from '../constants/theme'
import ProviderBookingsStackNavigator from './ProviderBookingsStackNavigator'
import { ProviderTabParamList } from './types'
import { ProfileStackNavigator } from './ProfileStackNavigator'
import Earnings from '../screens/provider/Earnings'
import ProviderServicesStackNavigator from './ProviderServicesStackNavigator'
import MessagesStackNavigator from './MessagesStackNavigator'
import MessageTabIcon from '../components/shared/MessageTabIcon'
import AppHeader from '../components/shared/AppHeader'
import { useState } from 'react'
import { useRegistrationNavigation } from '../store/registrationNavigation'
import { useAuthStore } from '../store/authStore'

const Tab = createBottomTabNavigator<ProviderTabParamList>()

export default function ProviderNavigator() {
    const { colors } = useTheme()
    const [initialRoute] = useState<keyof ProviderTabParamList>(() => useRegistrationNavigation.getState().userId === useAuthStore.getState().user?.id ? 'ServicesTab' : 'BookingsTab')

    return (
        <Tab.Navigator
            initialRouteName={initialRoute}
            screenListeners={({ route }) => ({
                tabPress: () => {
                    if (route.name !== 'ServicesTab') useRegistrationNavigation.getState().setUserId(null)
                },
            })}
            layout={({ children, navigation }) => (
                <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
                    <AppHeader onProfilePress={() => {
                        useRegistrationNavigation.getState().setUserId(null)
                        navigation.navigate('ProfileTab')
                    }} />
                    <View style={styles.tabs}>{children}</View>
                </SafeAreaView>
            )}
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.navInactive,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: 110,
                    paddingTop: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontFamily: fonts.medium,
                    textAlign: 'center',
                },
            }}
        >
            <Tab.Screen
                name="BookingsTab"
                component={ProviderBookingsStackNavigator}
                options={{
                    tabBarLabel: 'Painel',
                    tabBarIcon: ({ color, size }) => (
                        <LayoutDashboardIcon color={color} size={size} />
                    ),
                }}
            />

            <Tab.Screen
                name="ServicesTab"
                component={ProviderServicesStackNavigator}
                options={{
                    tabBarLabel: 'Serviços',
                    tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
                }}
            />

            <Tab.Screen
                name="EarningsTab"
                component={Earnings}
                options={{
                    tabBarLabel: 'Rendimentos',
                    tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
                }}
            />

            <Tab.Screen
                name="MessagesTab"
                component={MessagesStackNavigator}
                options={{
                    tabBarLabel: 'Mensagens',
                    tabBarIcon: ({ color, size }) => (
                        <MessageTabIcon color={color} size={size} />
                    ),
                }}
            />

            <Tab.Screen
                name="ProfileTab"
                component={ProfileStackNavigator}
                options={{
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    tabs: { flex: 1 },
})
