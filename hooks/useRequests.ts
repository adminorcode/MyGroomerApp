import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeBookingStatus } from '../services/booking.service'
import { getProviderRequests } from '../services/requests.service'
import { BookingStatus } from '../types/booking.types'
import { RequestGroupFilter } from '../types/request.types'

export const useProviderRequests = (group: RequestGroupFilter) => {
  return useQuery({
    queryKey: ['provider-requests', group],
    queryFn: () => getProviderRequests(group),
  })
}

export type RequestResponse = 'accept' | 'reject'

export const useRespondToRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, response }: { bookingId: string, response: RequestResponse }) =>
      changeBookingStatus(bookingId, response === 'accept' ? BookingStatus.CONFIRMED : BookingStatus.CANCELLED),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-requests'] })
      queryClient.invalidateQueries({ queryKey: ['provider-agenda'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking'] })
    },
  })
}
