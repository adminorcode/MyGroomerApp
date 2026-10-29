import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, StatusBar, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './navigation'
import { fonts } from './constants/theme'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { RuntimeProvider } from './context/RuntimeContext'
import { SocketProvider } from './context/SocketContext'
import { useAuthStore } from './store/authStore'

SplashScreen.preventAutoHideAsync()

function SessionApp() {
  const { colors } = useTheme()
  const { token, user, hasHydrated } = useAuthStore()
  // Each session owns its cache. Old requests cannot populate the next account.
  const queryClient = useMemo(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }), [token, user?.id, user?.role])
  useEffect(() => () => { void queryClient.cancelQueries(); queryClient.clear() }, [queryClient])
  if (!hasHydrated) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" />
      <QueryClientProvider client={queryClient}>
        <RuntimeProvider>
          <SocketProvider><RootNavigator /></SocketProvider>
        </RuntimeProvider>
      </QueryClientProvider>
    </View>
  )
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.logo]: require('./assets/fonts/Abres.ttf'),
    [fonts.regular]: require('./assets/fonts/Montserrat-Regular.ttf'),
    [fonts.medium]: require('./assets/fonts/Montserrat-Medium.ttf'),
    [fonts.semibold]: require('./assets/fonts/Montserrat-SemiBold.ttf'),
  })
  useEffect(() => { if (fontsLoaded || fontError) void SplashScreen.hideAsync() }, [fontsLoaded, fontError])
  if (!fontsLoaded && !fontError) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider><ThemeProvider><SessionApp /></ThemeProvider></SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
