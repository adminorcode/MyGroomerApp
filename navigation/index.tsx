import { createStackNavigator } from '@react-navigation/stack'
import { DefaultTheme, NavigationContainer, LinkingOptions } from '@react-navigation/native'
import { useAuthStore } from '../store/authStore'
import AuthNavigator from './AuthNavigator'
import ProviderNavigator from './ProviderNavigator'
import CustomerNavigator from './CustomerNavigator'
import ChatScreen from '../screens/customer/ChatScreen'
import * as Linking from 'expo-linking'
import { useSyncUnreadFromConversations, useUnreadMessagesListener } from '../hooks/useUnreadMessages'
import { useTheme } from '../context/ThemeContext'
import { RootParamList } from './types'
import { APP_SCHEME } from '../constants/brand'

const prefix = Linking.createURL('/')

const linking: LinkingOptions<RootParamList> = {
    prefixes: [prefix, `${APP_SCHEME}://`],
    config: {
        screens: {
            Auth: {
                screens: {
                    Login: 'login',
                    Register: 'register',
                    VerifyEmail: 'verify-email',
                },
            },
        },
    },
}

const Stack = createStackNavigator<RootParamList>()

export default function RootNavigator() {
    const { token, user } = useAuthStore()
    const { colors } = useTheme()
    const navigationTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.error,
        },
    }

    useUnreadMessagesListener()
    useSyncUnreadFromConversations()

    return (
        <NavigationContainer linking={linking} theme={navigationTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!token ? (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                ) : (
                    <>
                        {user?.role === 'provider' ? (
                            <Stack.Screen name="Provider" component={ProviderNavigator} />
                        ) : (
                            <Stack.Screen name="Customer" component={CustomerNavigator} />
                        )}
                        <Stack.Screen name="Chat" component={ChatScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    )
}
