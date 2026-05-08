import OpenAI from 'openai'
import { getTripMemberPreferences } from './preference.service'
import { prisma } from '../lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

export interface ItineraryContent {
  destination: string
  tripDuration: number
  conflictSummary: string
  recommendedDates: string
  budgetNote: string
  days: ItineraryDay[]
}

function buildSystemPrompt(): string {
  return `# ROLE
You are an expert travel planner with deep knowledge of global destinations, local culture, logistics, budgeting, and personalized trip design. You help users build complete, realistic, and memorable travel itineraries.

# CORE RESPONSIBILITIES
- Help users plan trips by destination, duration, budget, and travel style
- Suggest daily activities, must-see attractions, hidden gems, and local experiences
- Recommend accommodations, transport options, and dining based on user preferences
- Add notes, warnings, and tips (visa, weather, safety, currency, packing)
- Organize everything into a clear day-by-day itinerary structure

# BEHAVIOR RULES
- Tailor suggestions to the group's travel style (adventure, luxury, family, etc.)
- Prioritize practical, actionable advice over generic descriptions
- Weave each member's wildcard/custom activity naturally into the itinerary
- Flag if a day is overpacked and balance accordingly
- Suggest alternatives if a popular attraction is likely crowded or seasonal

# TONE
Friendly, knowledgeable, and enthusiastic — like a well-traveled friend giving personalized advice, not a generic travel brochure.

# CONSTRAINTS
- All prices MUST be in Indian Rupees (₹) — never use USD or other currencies
- Do not hallucinate specific prices or booking URLs — use realistic ₹ ranges and add "verify before booking"
- If a destination has travel advisories, mention it responsibly
- Stay focused on travel planning

# GROUP RECONCILIATION RULES (this is a GROUP trip planner)
- Majority vibes get full-day blocks; minority vibes get at least one activity
- Dietary needs with allergies (NUT_ALLERGY, GLUTEN_FREE) are ABSOLUTE constraints
- Budget: use the most common tier; where split, lean toward the higher tier
- Availability: pick dates within the overlap of all members' available windows
- Wildcard items: include at least one per member if space allows

# OUTPUT FORMAT
You MUST respond with ONLY valid JSON — no markdown fences, no extra text, no explanation outside the JSON.`
}

function buildUserPrompt(payload: object, totalDays: number): string {
  const dayTemplates = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1
    return `    {
      "dayNumber": ${d},
      "theme": "Day ${d} theme here",
      "slots": {
        "morning":   { "id": "d${d}_am",  "title": "...", "description": "2 sentences.", "emoji": "🌿", "category": "NATURE",        "estimatedCost": "₹500–1,000 pp",    "duration": "2–3 hrs", "tips": "local tip" },
        "afternoon": { "id": "d${d}_pm",  "title": "...", "description": "2 sentences.", "emoji": "🏛️", "category": "CULTURE",       "estimatedCost": "₹800–1,500 pp",    "duration": "3 hrs",   "tips": "local tip" },
        "evening":   { "id": "d${d}_eve", "title": "...", "description": "2 sentences.", "emoji": "🍜", "category": "FOOD_AND_DRINK","estimatedCost": "₹1,500–2,500 pp",  "duration": "2 hrs",   "tips": "local tip" }
      }
    }`
  }).join(',\n')

  return `Create a complete ${totalDays}-day group travel itinerary from this data.
You MUST generate ALL ${totalDays} days — do not stop early.

TRIP DATA:
${JSON.stringify(payload, null, 2)}

Respond ONLY with this JSON (fill in ALL ${totalDays} days in the "days" array):
{
  "destination": "city, country",
  "tripDuration": ${totalDays},
  "conflictSummary": "2-3 sentences on how you balanced conflicting preferences",
  "recommendedDates": "e.g. 15 Jun – 22 Jun 2025",
  "budgetNote": "1 sentence on budget reconciliation",
  "essentialTips": {
    "visa": "visa requirement note",
    "bestTime": "best time to visit note",
    "transport": "local transport tip",
    "safety": "safety note",
    "currency": "currency and payment tip",
    "mustPack": ["item1", "item2", "item3", "item4", "item5"]
  },
  "days": [
${dayTemplates}
  ]
}`
}

export async function refineItinerary(
  tripId: string,
  instruction: string
): Promise<ItineraryContent> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { name: true, destination: true },
  })
  if (!trip) throw new Error('Trip not found')

  const itinerary = await prisma.itinerary.findFirst({
    where: { tripId },
    orderBy: { version: 'desc' },
    select: { content: true },
  })
  if (!itinerary) throw new Error('No itinerary to refine')

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    temperature: 0.7,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: `You are refining an existing travel itinerary for "${trip.name}" to ${trip.destination}.

Current itinerary (JSON):
${JSON.stringify(itinerary.content, null, 2)}

User instruction: "${instruction}"

Apply the requested changes. Keep all unchanged days exactly as they are — only modify what was explicitly requested. Return the COMPLETE updated itinerary in EXACTLY the same JSON structure with all days. All prices in ₹. Respond with ONLY valid JSON.`,
      },
    ],
  })

  const text = response.choices[0].message.content ?? ''
  return JSON.parse(text) as ItineraryContent
}

export async function generateItinerary(tripId: string): Promise<ItineraryContent> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { name: true, destination: true, travelStart: true, travelEnd: true },
  })
  if (!trip) throw new Error('Trip not found')

  const memberPrefs = await getTripMemberPreferences(tripId)

  // Determine trip duration: use max of all submitted durationDays, fallback to 3
  const submittedDurations = memberPrefs
    .filter((m) => m.preference?.durationDays)
    .map((m) => m.preference!.durationDays as number)
  const totalDays = submittedDurations.length > 0
    ? Math.max(...submittedDurations)
    : 3

  const payload = {
    trip: {
      name: trip.name,
      destination: trip.destination,
      travelStart: trip.travelStart ?? null,
      travelEnd: trip.travelEnd ?? null,
      requestedDays: totalDays,
    },
    members: memberPrefs,
  }

  // Scale tokens with days: ~600 tokens per day, minimum 4096
  const maxTokens = Math.max(4096, totalDays * 700)

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(payload, totalDays) },
    ],
  })

  const text = response.choices[0].message.content ?? ''
  const parsed = JSON.parse(text) as ItineraryContent
  return parsed
}
