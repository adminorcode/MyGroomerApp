import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CustomerTabParamList } from './types'
import HomeStackNavigator from './HomeStackNavigator'
import BookingsStackNavigator from './BookingsStackNavigator'
import MessagesStackNavigator from './MessagesStackNavigator'
import { BookMinus, Home } from 'lucide-react-native'
import { useTheme } from '../context/ThemeContext'
import { fonts, layout, spacing, borderRadius } from '../constants/theme'
import { ProfileStackNavigator } from './ProfileStackNavigator'
import MessageTabIcon from '../components/shared/MessageTabIcon'
import TabIconPill from './TabIconPill'

const Tab = createBottomTabNavigator<CustomerTabParamList>()

export default function CustomerNavigator() {
    const { colors } = useTheme()
    const insets = useSafeAreaInsets()

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primaryText,
                tabBarInactiveTintColor: colors.navInactive,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: layout.tabBarHeight + insets.bottom,
                    paddingTop: spacing.sm,
                    paddingBottom: Math.max(insets.bottom, spacing.sm),
                    borderTopLeftRadius: borderRadius.xl,
                    borderTopRightRadius: borderRadius.xl,
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
                    tabBarIcon: ({ color, size, focused }) => <TabIconPill focused={focused}><Home color={color} size={size} /></TabIconPill>,
                }}
            />
            <Tab.Screen
                name="BookingsTab"
                component={BookingsStackNavigator}
                options={{
                    tabBarLabel: 'Agendamentos',
                    tabBarIcon: ({ color, size, focused }) => <TabIconPill focused={focused}><BookMinus color={color} size={size} /></TabIconPill>,
                }}
            />
            <Tab.Screen
                name="MessagesTab"
                component={MessagesStackNavigator}
                options={{
                    tabBarLabel: 'Mensagens',
                    tabBarIcon: ({ color, size, focused }) => (
                        <TabIconPill focused={focused}>
                            <MessageTabIcon color={color} size={size} />
                        </TabIconPill>
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
