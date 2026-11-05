import { BookingStatus, CreateBookingInput, CreateBookingResponse } from "../types/booking.types"
import api from "./api"

export type BookingSlots = { slots: string[], duration_minutes: number, price: number, timezone: 'America/Sao_Paulo' }

export const getBookingSlots = async (
    providerServiceId: string,
    petId: string,
    date: string,
    signal?: AbortSignal,
    rescheduleBookingId?: string,
) => {
    const response = await api.get('/bookings/slots', {
        params: {
            provider_service_id: providerServiceId,
            pet_id: petId,
            date,
            ...(rescheduleBookingId ? { reschedule_booking_id: rescheduleBookingId } : {}),
        },
        signal,
    })
    return response.data.data as BookingSlots
}


type GetBookingsParams = {
    as?: 'provider'
    status?: BookingStatus
}

export const getBookings = async (params: GetBookingsParams = {}) => {
    const response = await api.get('/bookings', { params })
    return response.data
}

export const createBooking = async (booking: CreateBookingInput): Promise<CreateBookingResponse> => {
    const response = await api.post('/bookings', booking)
    return response.data
}

export const findBookingById = async (bookingId: string) => {
    const response = await api.get(`/bookings/${bookingId}`)
    return response.data
}

export const changeBookingStatus = async (bookingId:string, booking_status:BookingStatus) =>{
    const response = await api.patch(`/bookings/${bookingId}/status`, {booking_status})
    return response.data
}

export const rescheduleBooking = async (bookingId: string, scheduled_at: string) => {
    const response = await api.patch(`/bookings/${bookingId}/schedule`, { scheduled_at })
    return response.data
}

export const openBookingConversation = async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/conversation`)
    return response.data
}
