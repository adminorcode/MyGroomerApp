import { useCallback, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { AddressSuggestion, reverseServiceLocation } from '../services/provider.service'

export type CurrentPlaceStatus = 'idle' | 'locating' | 'denied' | 'unavailable'

export function useCurrentPlace() {
    const [status, setStatus] = useState<CurrentPlaceStatus>('idle')
    const ticket = useRef(0)

    const capture = useCallback(async (): Promise<AddressSuggestion | null> => {
        const id = ticket.current + 1
        ticket.current = id
        setStatus('locating')
        try {
            const permission = await Location.requestForegroundPermissionsAsync()
            if (ticket.current !== id) return null
            if (permission.status !== 'granted') {
                setStatus('denied')
                return null
            }
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            if (ticket.current !== id) return null
            const result = await reverseServiceLocation(position.coords.latitude, position.coords.longitude)
            if (ticket.current !== id) return null
            setStatus('idle')
            return result.data
        } catch {
            if (ticket.current === id) setStatus('unavailable')
            return null
        }
    }, [])

    return { status, capture }
}
