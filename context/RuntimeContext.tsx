import { createContext, ReactNode, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import api from '../services/api'
import { useTheme } from './ThemeContext'

type RuntimeCapabilities = {
  localTest: boolean
  googleAuthEnabled: boolean
  paymentsEnabled: boolean
}

const RuntimeContext = createContext<RuntimeCapabilities>({
  localTest: false,
  googleAuthEnabled: false,
  paymentsEnabled: false,
})

export const useRuntime = () => useContext(RuntimeContext)

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  const runtime = useQuery({
    queryKey: ['runtime'],
    queryFn: async () => (await api.get<{ data: RuntimeCapabilities }>('/runtime')).data.data,
    retry: false,
    staleTime: 60_000,
  })

  if (runtime.isPending) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Connecting to API" /></View>
  }

  if (runtime.isError || !runtime.data) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: colors.error }}>API indisponível. Verifique se o servidor local está iniciado.</Text>
        <Pressable accessibilityRole="button" onPress={() => runtime.refetch()}>
          <Text style={{ color: colors.primary }}>Tentar novamente</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <RuntimeContext.Provider value={runtime.data}>
      {runtime.data.localTest && (
        <View style={{ padding: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, textAlign: 'center' }}>Ambiente de teste local — pagamentos e e-mails reais desativados.</Text>
        </View>
      )}
      {children}
    </RuntimeContext.Provider>
  )
}
