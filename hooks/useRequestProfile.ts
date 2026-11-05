import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRequestProfile, saveAnamnesisNote } from '../services/requestProfile.service'

export const useRequestProfile = (bookingId: string) => {
  return useQuery({
    queryKey: ['provider-request-profile', bookingId],
    queryFn: () => getRequestProfile(bookingId),
  })
}

export const useSaveAnamnesisNote = (bookingId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: string) => saveAnamnesisNote(bookingId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-request-profile', bookingId] })
    },
  })
}
