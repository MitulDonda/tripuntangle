import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface VoteCounts {
  up: number
  down: number
  myVote: 'THUMBS_UP' | 'THUMBS_DOWN' | null
}

export interface VotesMap {
  itineraryId: string
  votes: Record<string, VoteCounts>
}

export function useVotes(tripId: string, hasItinerary = false) {
  return useQuery<VotesMap>({
    queryKey: ['votes', tripId],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/votes`)
      return res.data
    },
    enabled: !!tripId && hasItinerary,
    staleTime: 30_000,
  })
}

export function useCastVote(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { activityId: string; itineraryId: string; value: 'THUMBS_UP' | 'THUMBS_DOWN' | 'REMOVE' }) => {
      const res = await api.post(`/trips/${tripId}/vote`, payload)
      return res.data
    },
    // Optimistic update — flip the button instantly before server confirms
    onMutate: async ({ activityId, value }) => {
      await queryClient.cancelQueries({ queryKey: ['votes', tripId] })
      const previous = queryClient.getQueryData<VotesMap>(['votes', tripId])
      queryClient.setQueryData<VotesMap>(['votes', tripId], (old) => {
        if (!old) return old
        const prev = old.votes?.[activityId] ?? { up: 0, down: 0, myVote: null }
        const wasUp   = prev.myVote === 'THUMBS_UP'
        const wasDown = prev.myVote === 'THUMBS_DOWN'
        const newVote = prev.myVote === value ? null : value  // toggle off if same

        return {
          ...old,
          votes: {
            ...old.votes,
            [activityId]: {
              up:   (value === 'THUMBS_UP'   ? (wasUp   ? prev.up - 1 : prev.up + 1)   : wasUp   ? prev.up - 1   : prev.up),
              down: (value === 'THUMBS_DOWN' ? (wasDown ? prev.down - 1 : prev.down + 1) : wasDown ? prev.down - 1 : prev.down),
              myVote: newVote === 'REMOVE' ? null : newVote,
            },
          },
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      // Roll back on failure
      if (context?.previous) {
        queryClient.setQueryData(['votes', tripId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['votes', tripId] })
    },
  })
}
