import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export type BudgetTier = 'BACKPACKER' | 'FLASHPACKER' | 'LUXURY'
export type Vibe = 'NIGHTLIFE' | 'NATURE' | 'ADVENTURE' | 'RELAXATION' | 'CULTURE' | 'FOOD_AND_DRINK' | 'WELLNESS'
export type Dietary = 'VEGETARIAN' | 'VEGAN' | 'NON_VEGETARIAN' | 'GLUTEN_FREE' | 'NUT_ALLERGY' | 'OTHER'

export interface PreferenceInput {
  availStart: string
  availEnd: string
  durationDays: number
  budgetTier: BudgetTier
  vibes: Vibe[]
  dietary: Dietary[]
  wildcardText?: string
}

export function useMyPreference(tripId: string) {
  return useQuery<PreferenceInput | null>({
    queryKey: ['preferences', tripId, 'me'],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/preferences/me`)
      return res.data
    },
    enabled: !!tripId,
    staleTime: 60_000,
  })
}

export function useSubmitPreference(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: PreferenceInput) => {
      const res = await api.post(`/trips/${tripId}/preferences`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', tripId] })
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
