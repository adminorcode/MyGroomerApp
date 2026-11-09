export type HeaderTone = 'teal' | 'pink'

/** Telas do tutor e do pet. O restante autenticado segue o verde da operação. */
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
 * A barra usa a cor da tela: rosa no território do tutor/pet e verde nos hubs
 * e na operação do profissional. Perfil, chat e vitrine seguem o papel.
 */
export function headerToneFor(route: string | undefined, role: string | undefined): HeaderTone {
    const provider = role === 'provider'
    if (route === 'Profile' || route === 'Chat' || route === 'DesignSystemShowcase') {
        return provider ? 'teal' : 'pink'
    }
    if (!provider && route && PINK_ROUTES.has(route)) return 'pink'
    return 'teal'
}
