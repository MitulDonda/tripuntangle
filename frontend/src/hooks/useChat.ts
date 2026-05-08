import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface ChatMessage {
  id: string
  tripId: string
  senderType: 'USER' | 'AI'
  senderId: string | null
  content: string
  createdAt: string
  sender?: { name: string; avatarUrl: string | null } | null
}

export function useChatHistory(tripId: string) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chat', tripId],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/chat`)
      return res.data
    },
    enabled: !!tripId,
  })
}

export function useSendMessage(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/trips/${tripId}/chat`, { content })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', tripId] })
    },
  })
}
