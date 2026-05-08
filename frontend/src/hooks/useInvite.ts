import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import axios from 'axios'

export function useInviteMembers(tripId: string) {
  return useMutation({
    mutationFn: async (emails: string[]) => {
      const res = await api.post(`/trips/${tripId}/invite`, { emails })
      return res.data
    },
  })
}

export function useJoinTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await api.post(`/join/${inviteCode}`)
      return res.data as { tripId: string; alreadyMember: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useTripByInviteCode(inviteCode: string | undefined) {
  return useQuery({
    queryKey: ['invite', inviteCode],
    queryFn: async () => {
      const res = await axios.get(`/api/join/${inviteCode}`)
      return res.data as { id: string; name: string; destination: string; shortCode: string }
    },
    enabled: !!inviteCode,
    retry: false,
  })
}
