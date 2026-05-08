import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface GroupMessage {
  id: string
  tripId: string
  senderId: string
  content: string
  createdAt: string
  sender: { id: string; name: string; avatarUrl: string | null }
}

export function useGroupChatHistory(tripId: string) {
  return useQuery<GroupMessage[]>({
    queryKey: ['group-chat', tripId],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/group-messages`)
      return res.data
    },
    enabled: !!tripId,
  })
}

export function useSendGroupMessage(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/trips/${tripId}/group-messages`, { content })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat', tripId] })
    },
  })
}
