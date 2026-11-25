import { createContext, ReactNode, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import MGScreen from '../design-system/components/MGScreen'

type RuntimeCapabilities = {
  localTest: boolean
  googleAuthEnabled: boolean
  paymentsEnabled: boolean
  petPhotoRequired: boolean
}

const RuntimeContext = createContext<RuntimeCapabilities>({
  localTest: false,
  googleAuthEnabled: false,
  paymentsEnabled: false,
  petPhotoRequired: false,
})

export const useRuntime = () => useContext(RuntimeContext)

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useQuery({
    queryKey: ['runtime'],
    queryFn: async () => (await api.get<{ data: RuntimeCapabilities }>('/runtime')).data.data,
    retry: false,
    staleTime: 60_000,
  })

  if (runtime.isPending) {
    return <MGScreen loading />
  }

  if (runtime.isError || !runtime.data) {
    return (
      <MGScreen
        error="API indisponível. Verifique se o servidor local está iniciado."
        onRetry={() => { void runtime.refetch() }}
      />
    )
  }

  return (
    <RuntimeContext.Provider value={runtime.data}>
      {children}
    </RuntimeContext.Provider>
  )
}
