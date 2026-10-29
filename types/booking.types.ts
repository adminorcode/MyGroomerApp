import { PressableProps, StyleProp, ViewStyle } from "react-native"

export enum BookingStatus {
    PENDING_PAYMENT = 'pending_payment',
    PENDING_CONFIRMATION = 'pending_confirmation',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed'
}

export interface Booking {
    id: string
    customer_id: string
    provider_user_id:string
    provider_service_id: string
    pet_id?: string | null
    pet_name?: string | null
    pet_species?: string | null
    pet_breed?: string | null
    pet_size?: string | null
    pet_age_years?: number | null
    pet_notes?: string | null
    scheduled_at: string
    booking_status: BookingStatus
    service_name: string
    provider_name: string
    customer_name:string
    price: number
    review_id:string
    customer_location: string
    customer_latitude?: number
    customer_longitude?: number
    created_at: Date
    updated_at: Date
}

export type CreateBookingInput = {
    pet_id: string
    provider_service_id: string
    scheduled_at: Date
    customer_location: string
    customer_latitude?: number
    customer_longitude?: number
}

export type BookingCardTypes = {
    service_name?: string
    provider_name?: string
    customer_name?:string
    perspective?:'customer' | 'provider'
    price?: number
    scheduled_at: string
    customer_location: string
    booking_status: BookingStatus
    showChevron?: boolean
    onPress?: () => void
    style?: StyleProp<ViewStyle>
}