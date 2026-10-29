import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createConversation, getConversationMessages, getConversations, markConversationRead } from "../services/conversation.service"
import { ConversationListItem, Message } from "../types/conversation.types"
import { useAuthStore } from '../store/authStore'

export const useGetConversations = () => {
    const token = useAuthStore(state => state.token)
    return useQuery({
        queryKey: ['conversations'],
        queryFn: getConversations,
        select: (data) => data.data as ConversationListItem[],
        enabled: !!token,
    })
}

export const useGetConversationMessages = (conversationId: string) => {
    return useInfiniteQuery({
        queryKey: ['conversation-messages', conversationId],
        queryFn: ({pageParam}) => getConversationMessages(conversationId, pageParam),
        initialPageParam:null as {cursor_time:string, cursor_id:string} | null,
        getNextPageParam:(lastPage)=>{
            const messages = lastPage.data
            if (messages.length < 20) return undefined
            const oldest = messages[messages.length - 1];
            return oldest ? {cursor_time: oldest.created_at, cursor_id: oldest.id} : undefined
        },
        select: (data)=> data.pages.flatMap((page)=>page.data),
        enabled: !!conversationId,
    })
}

export const useCreateConversation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: { booking_id?: string; provider_id: string }) => createConversation(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
        onError: (error) => {
            console.log(error)
        }
    })
}

export const useMarkConversationRead = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (conversationId: string) => markConversationRead(conversationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
    })
}
