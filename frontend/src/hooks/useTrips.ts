import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface TripMemberUser {
  id: string
  name: string
  avatarUrl: string | null
}

export interface TripMember {
  id: string
  role: 'OWNER' | 'MEMBER'
  inviteStatus: 'PENDING' | 'ACCEPTED'
  inviteEmail?: string | null
  user: TripMemberUser
}

export interface TripItinerary {
  id: string
  tripId: string
  version: number
  content: unknown
  generatedAt: string
}

export interface Trip {
  id: string
  name: string
  destination: string
  travelStart: string | null
  travelEnd: string | null
  status: 'PLANNING' | 'GENERATING' | 'FINALISED' | 'ARCHIVED'
  inviteCode: string
  shortCode: string
  createdAt: string
  members: TripMember[]
  itineraries?: TripItinerary[]   // latest itinerary already included by getTripById
  _count?: { members: number }
}

export function useTrips() {
  return useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: async () => {
      const res = await api.get('/trips')
      return res.data
    },
    staleTime: 60_000,
  })
}

export function useTrip(id: string) {
  return useQuery<Trip>({
    queryKey: ['trips', id],
    queryFn: async () => {
      const res = await api.get(`/trips/${id}`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useLookupTrip() {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.get(`/join/${encodeURIComponent(code.trim())}`)
      return res.data as { id: string; name: string; destination: string; status: string; shortCode: string; inviteCode: string; memberCount: number }
    },
  })
}

export function useJoinTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post(`/join/${encodeURIComponent(code.trim())}`)
      return res.data as { tripId: string; alreadyMember: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tripId: string) => {
      await api.delete(`/trips/${tripId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string
      destination: string
      travelStart?: string
      travelEnd?: string
    }) => {
      const res = await api.post('/trips', data)
      return res.data as Trip
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
