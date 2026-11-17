export type HeaderTone = 'teal' | 'pink'

/** Telas do tutor e do pet. O restante autenticado fica na classificação teal, sem pintar a barra. */
const PINK_ROUTES = new Set([
    'Pets',
    'PetForm',
    'Addresses',
    'AddressForm',
    'MyBookings',
    'BookingDetail',
    'ReviewBooking',
    'ReviewDetail',
])

/**
 * Classifica a rota. A barra autenticada não usa mais essa cor: o topo é canvas
 * e o rosa fica no logo, no botão e no avatar do profissional.
 */
export function headerToneFor(route: string | undefined, role: string | undefined): HeaderTone {
    const provider = role === 'provider'
    if (route === 'Profile' || route === 'Chat' || route === 'DesignSystemShowcase') {
        return provider ? 'teal' : 'pink'
    }
    if (!provider && route && PINK_ROUTES.has(route)) return 'pink'
    return 'teal'
}
