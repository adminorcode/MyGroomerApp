import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Bell, CalendarDays, Wallet, Wrench } from 'lucide-react-native'
import { useTheme } from '../context/ThemeContext'
import { fonts } from '../constants/theme'
import ProviderBookingsStackNavigator from './ProviderBookingsStackNavigator'
import { ProviderTabParamList } from './types'
import { ProfileStackNavigator } from './ProfileStackNavigator'
import Earnings from '../screens/provider/Earnings'
import ProviderRequestsScreen from '../screens/provider/ProviderRequestsScreen'
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
    const { width } = useWindowDimensions()
    // Cinco abas: com o ellipsis padrão do rótulo, "Solicitações" e "Rendimentos" viram "Solicitaçõ...".
    // O rótulo próprio cabe inteiro (11 pt, 10 pt abaixo de 360 pt) e nunca é cortado.
    // Como nas barras de aba do sistema, o tamanho não cresce com o texto ampliado do aparelho.
    const tabLabel = (label: string) => ({ color }: { color: string }) => (
        <Text maxFontSizeMultiplier={1} style={{ color, fontSize: width < 360 ? 10 : 11, fontFamily: fonts.medium, textAlign: 'center' }}>{label}</Text>
    )
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
                    tabBarLabel: tabLabel('Agenda'),
                    tabBarAccessibilityLabel: 'Agenda',
                    tabBarIcon: ({ color, size }) => (
                        <CalendarDays color={color} size={size} />
                    ),
                }}
            />

            <Tab.Screen
                name="RequestsTab"
                component={ProviderRequestsScreen}
                options={{
                    tabBarLabel: tabLabel('Solicitações'),
                    tabBarAccessibilityLabel: 'Solicitações',
                    tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
                }}
            />

            <Tab.Screen
                name="ServicesTab"
                component={ProviderServicesStackNavigator}
                options={{
                    tabBarLabel: tabLabel('Serviços'),
                    tabBarAccessibilityLabel: 'Serviços',
                    tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
                }}
            />

            <Tab.Screen
                name="EarningsTab"
                component={Earnings}
                options={{
                    tabBarLabel: tabLabel('Rendimentos'),
                    tabBarAccessibilityLabel: 'Rendimentos',
                    tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
                }}
            />

            <Tab.Screen
                name="MessagesTab"
                component={MessagesStackNavigator}
                options={{
                    tabBarLabel: tabLabel('Mensagens'),
                    tabBarAccessibilityLabel: 'Mensagens',
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
