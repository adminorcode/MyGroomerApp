import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReview, getReviewById, getReviews } from '../services/review.service'

export type PublicReview = {
  id: string
  rating: number
  comment?: string | null
  created_at: string
  author_name?: string | null
}

export const useCreateReviews = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { booking_id: string, rating: number, comment: string }) => createReview(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.booking_id] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export const useGetReviewById = (reviewId?: string) => {
  return useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => getReviewById(reviewId as string),
    enabled: Boolean(reviewId),
    select: (response: { data: { rating: number, comment?: string | null, created_at?: string | Date } }) => response.data,
  })
}

export const useProviderReviews = (providerUserId?: string) => {
  return useQuery({
    queryKey: ['reviews', 'provider', providerUserId],
    queryFn: async () => (await getReviews(providerUserId)).data as PublicReview[],
    enabled: Boolean(providerUserId),
    retry: false,
  })
}
