import { createStackNavigator } from '@react-navigation/stack'
import { createNavigationContainerRef, DefaultTheme, NavigationContainer, LinkingOptions, StackActions } from '@react-navigation/native'
import { useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/authStore'
import { useRegistrationNavigation } from '../store/registrationNavigation'
import AuthNavigator from './AuthNavigator'
import ProviderNavigator from './ProviderNavigator'
import CustomerNavigator from './CustomerNavigator'
import ChatScreen from '../screens/customer/ChatScreen'
import AppHeader from '../components/shared/AppHeader'
import * as Linking from 'expo-linking'
import { useSyncUnreadFromConversations, useUnreadMessagesListener } from '../hooks/useUnreadMessages'
import { useTheme } from '../context/ThemeContext'
import { useMGTheme } from '../design-system/theme/useMGTheme'
import { RootParamList } from './types'
import { APP_SCHEME } from '../constants/brand'
import { AuthenticatedChromeContext } from './authenticatedChrome'
import { headerToneFor } from './headerTone'

export const navigationRef = createNavigationContainerRef<RootParamList>()

function alreadyOnProfileRoot(rootName: 'Provider' | 'Customer') {
    if (!navigationRef.isReady()) return false
    const state = navigationRef.getRootState()
    const route = state.routes[state.index ?? 0]
    if (route?.name !== rootName || !route.state) return false
    const tab = route.state.routes[route.state.index ?? 0]
    if (tab?.name !== 'ProfileTab') return false
    if (!tab.state) return true
    return tab.state.routes[tab.state.index ?? 0]?.name === 'Profile'
}

function openAccount() {
    if (!navigationRef.isReady()) return
    const provider = useAuthStore.getState().user?.role === 'provider'
    if (provider) useRegistrationNavigation.getState().setUserId(null)
    const rootName = provider ? 'Provider' : 'Customer'
    const current = navigationRef.getRootState().routes[navigationRef.getRootState().index ?? 0]
    if (current?.name === 'Chat') navigationRef.dispatch(StackActions.pop())
    if (alreadyOnProfileRoot(rootName)) return
    if (provider) navigationRef.navigate('Provider', { screen: 'ProfileTab', params: { screen: 'Profile' } })
    else navigationRef.navigate('Customer', { screen: 'ProfileTab', params: { screen: 'Profile' } })
}

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
            Provider: {
                screens: {
                    RequestsTab: {
                        screens: {
                            ProviderRequestProfile: 'ficha/:bookingId',
                        },
                    },
                },
            },
        },
    },
}

const Stack = createStackNavigator<RootParamList>()

export default function RootNavigator() {
    const { token, user } = useAuthStore()
    const { colors } = useTheme()
    const theme = useMGTheme()
    const [routeName, setRouteName] = useState<string | undefined>()
    const tone = headerToneFor(routeName, user?.role)
    const headerColor = tone === 'pink' ? theme.colors.action.primary : theme.colors.brand.teal
    const syncRoute = () => setRouteName(navigationRef.getCurrentRoute()?.name)
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

    const sessions = (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user?.role === 'provider' ? (
                <Stack.Screen name="Provider" component={ProviderNavigator} />
            ) : (
                <Stack.Screen name="Customer" component={CustomerNavigator} />
            )}
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    )

    return (
        <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme} onReady={syncRoute} onStateChange={syncRoute}>
            {!token ? (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                </Stack.Navigator>
            ) : (
                <AuthenticatedChromeContext.Provider value={true}>
                    <View style={{ flex: 1, backgroundColor: theme.colors.surface.canvas }}>
                        <SafeAreaView edges={['top']} style={{ backgroundColor: headerColor }}>
                            <AppHeader tone={tone} onProfilePress={openAccount} />
                        </SafeAreaView>
                        <View style={{ flex: 1 }}>{sessions}</View>
                    </View>
                </AuthenticatedChromeContext.Provider>
            )}
        </NavigationContainer>
    )
}
