import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ItineraryContent } from '../types/itinerary'

export interface Itinerary {
  id: string
  tripId: string
  version: number
  content: ItineraryContent
  generatedAt: string
}

export function useLatestItinerary(tripId: string) {
  return useQuery<Itinerary | null>({
    queryKey: ['itinerary', tripId],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/itinerary`)
      return res.data
    },
    enabled: !!tripId,
  })
}

export function useGenerateItinerary(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/trips/${tripId}/generate`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] })
    },
  })
}

export function useRefineItinerary(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (instruction: string) => {
      const res = await api.post(`/trips/${tripId}/refine`, { instruction })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] })
    },
  })
}

export function useResetTripStatus(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/trips/${tripId}/reset-status`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] })
    },
  })
}
