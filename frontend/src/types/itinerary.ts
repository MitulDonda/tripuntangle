export interface Activity {
  id: string
  title: string
  description: string
  emoji: string
  category: string
  estimatedCost: string
  duration: string
  tips?: string
}

export interface DaySlots {
  morning: Activity
  afternoon: Activity
  evening: Activity
}

export interface ItineraryDay {
  dayNumber: number
  theme: string
  slots: DaySlots
}

export interface EssentialTips {
  visa?: string
  bestTime?: string
  transport?: string
  safety?: string
  mustPack?: string[]
  currency?: string
}

export interface ItineraryContent {
  destination: string
  tripDuration: number
  conflictSummary: string
  recommendedDates: string
  budgetNote: string
  days: ItineraryDay[]
  essentialTips?: EssentialTips
}
