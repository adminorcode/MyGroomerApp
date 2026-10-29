export enum Role {
    CUSTOMER = 'customer',
    PROVIDER = 'provider',
    ADMIN = 'admin',
}

export type User = {
    id: string
    name: string
    email: string
    role: 'customer' | 'provider' | 'admin'
}


export type AuthStore = {
    hasHydrated: boolean
    setHydrated: () => void
    token: string | null
    user: User | null
    setAuth: (token: string, user: User) => void
    logout: () => void
}
