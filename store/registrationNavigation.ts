import { create } from 'zustand'

// Keep the new account's destination through session-provider remounts. This
// contains no credentials, is scoped to one user, and resets on normal login/logout.
export const useRegistrationNavigation = create<{ userId: string | null; setUserId: (userId: string | null) => void }>(set => ({
  userId: null,
  setUserId: userId => set({ userId }),
}))
