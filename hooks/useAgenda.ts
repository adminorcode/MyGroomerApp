import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAgendaBlock, deleteAgendaBlock, getProviderAgenda } from '../services/agenda.service'

export const useProviderAgenda = (from: string, to: string) => {
  return useQuery({
    queryKey: ['provider-agenda', from, to],
    queryFn: () => getProviderAgenda(from, to),
  })
}

export const useCreateAgendaBlock = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ starts_at, ends_at }: { starts_at: string, ends_at: string }) => createAgendaBlock(starts_at, ends_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-agenda'] })
    },
  })
}

export const useDeleteAgendaBlock = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (blockId: string) => deleteAgendaBlock(blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-agenda'] })
    },
  })
}
