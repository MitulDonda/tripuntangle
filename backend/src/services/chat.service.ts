import OpenAI from 'openai'
import { prisma } from '../lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateChatReply(tripId: string, userMessage: string): Promise<string> {
  // Get trip + latest itinerary
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { name: true, destination: true },
  })

  const itinerary = await prisma.itinerary.findFirst({
    where: { tripId },
    orderBy: { version: 'desc' },
    select: { content: true },
  })

  // Get last 12 messages for context
  const history = await prisma.chatMessage.findMany({
    where: { tripId },
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: { sender: { select: { name: true } } },
  })
  history.reverse()

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert travel planner helping a group plan their trip to ${trip?.destination ?? 'their destination'} (Trip: "${trip?.name}").

${itinerary ? `Current itinerary:\n${JSON.stringify(itinerary.content, null, 2)}` : 'No itinerary generated yet.'}

Be friendly, concise, and helpful. Answer questions about the trip, suggest modifications, flag concerns.
All prices should be in Indian Rupees (₹). Keep responses under 200 words unless asked for detail.`,
    },
    ...history.map((m) => ({
      role: (m.senderType === 'AI' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.senderType === 'USER' ? `${m.sender?.name ?? 'Member'}: ${m.content}` : m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    temperature: 0.8,
    max_tokens: 512,
    messages,
  })

  return response.choices[0].message.content ?? 'Sorry, I could not generate a response.'
}
