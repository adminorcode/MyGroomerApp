import { createContext, useContext } from 'react'

/** Área autenticada já consome o inset superior no topo de marca/avatar. */
export const AuthenticatedChromeContext = createContext(false)

export function useAuthenticatedChrome() {
    return useContext(AuthenticatedChromeContext)
}
