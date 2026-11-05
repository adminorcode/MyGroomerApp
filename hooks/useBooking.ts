import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    changeBookingStatus,
    createBooking,
    findBookingById,
    getBookings,
    getBookingSlots,
    openBookingConversation,
    rescheduleBooking,
} from "../services/booking.service"
import { Booking, BookingStatus, CreateBookingInput } from "../types/booking.types"


export const useGetBookings = (status?: BookingStatus) => {
    return useQuery({
        queryKey: ['bookings', 'customer', status ?? 'all'],
        queryFn: () => getBookings({ status }),
        select: (data) => data.data
    })
}

export const useGetProviderBookings = (status?: BookingStatus) => {
    return useQuery({
        queryKey: ['bookings', 'provider', status ?? 'all'],
        queryFn: () => getBookings({ as: 'provider', status }),
        select: (data) => data.data
    })
}

export const useCreateBooking = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (booking: CreateBookingInput) => createBooking(booking),
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey:['bookings']})
        },
        onError: (error) => {
            console.log(error)
        }
    })
}

export const useGetBookingById = (bookingId: string) => {
    return useQuery({
        queryKey: ['booking', bookingId],
        queryFn: () => findBookingById(bookingId),
        select: (data) => data.data as Booking,
        enabled: !!bookingId
    })
}

export const useChangeBookingStatus = ()=>{
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({bookingId, booking_status}:{bookingId:string, booking_status:BookingStatus}) => changeBookingStatus(bookingId, booking_status),
        onSuccess: ()=>{
            queryClient.invalidateQueries({queryKey: ['bookings']})
            queryClient.invalidateQueries({queryKey: ['booking']})
            queryClient.invalidateQueries({queryKey: ['provider-requests']})
            queryClient.invalidateQueries({queryKey: ['provider-agenda']})
        },
        onError: (error) =>{
            console.log(error)
        }
    })
}

export const useRescheduleBooking = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ bookingId, scheduled_at }: { bookingId: string, scheduled_at: string }) => (
            rescheduleBooking(bookingId, scheduled_at)
        ),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] })
            queryClient.invalidateQueries({ queryKey: ['provider-requests'] })
            queryClient.invalidateQueries({ queryKey: ['provider-agenda'] })
        },
    })
}

export const useRescheduleBookingSlots = (
    bookingId: string,
    providerServiceId: string,
    petId: string | null | undefined,
    date: string,
    enabled: boolean,
) => useQuery({
    queryKey: ['booking-slots', 'reschedule', bookingId, date],
    queryFn: ({ signal }) => getBookingSlots(providerServiceId, petId!, date, signal, bookingId),
    enabled: enabled && Boolean(petId),
    select: data => data.slots,
})

export const useOpenBookingConversation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (bookingId: string) => openBookingConversation(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
    })
}