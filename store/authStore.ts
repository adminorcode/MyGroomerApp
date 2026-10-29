import { create, StoreApi, UseBoundStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthStore } from '../types/auth.types'
import { useUnreadStore } from './unreadStore'



let finishHydration: () => void = () => {}

export const useAuthStore: UseBoundStore<StoreApi<AuthStore>> = create<AuthStore>()(
    persist(
        (set) => {
            finishHydration = () => set({ hasHydrated: true })
            return ({
            hasHydrated: false,
            setHydrated: () => set({ hasHydrated: true }),
            token: null,
            user: null,
            setAuth: (token, user) => set({token, user}),
            logout: () => {
                useUnreadStore.setState({ hasUnreadMessages: false, activeConversationId: null })
                set({token: null, user: null})
            }
            })
        },
        {
            name: 'auth-store',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: ({ token, user }) => ({ token, user }),
            onRehydrateStorage: () => () => finishHydration(),
        }
    )
)
