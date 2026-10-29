import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CustomerTabParamList } from './types'
import HomeStackNavigator from './HomeStackNavigator'
import BookingsStackNavigator from './BookingsStackNavigator'
import MessagesStackNavigator from './MessagesStackNavigator'
import { BookMinus, Home } from 'lucide-react-native'
import { useTheme } from '../context/ThemeContext'
import { fonts } from '../constants/theme'
import { ProfileStackNavigator } from './ProfileStackNavigator'
import MessageTabIcon from '../components/shared/MessageTabIcon'
import AppHeader from '../components/shared/AppHeader'

const Tab = createBottomTabNavigator<CustomerTabParamList>()

export default function CustomerNavigator() {
    const { colors } = useTheme()

    return (
        <Tab.Navigator
            layout={({ children, navigation }) => (
                <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
                    <AppHeader onProfilePress={() => navigation.navigate('ProfileTab')} />
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
                name="HomeTab"
                component={HomeStackNavigator}
                options={{
                    tabBarLabel: 'Início',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="BookingsTab"
                component={BookingsStackNavigator}
                options={{
                    tabBarLabel: 'Agendamentos',
                    tabBarIcon: ({ color, size }) => <BookMinus color={color} size={size} />,
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
