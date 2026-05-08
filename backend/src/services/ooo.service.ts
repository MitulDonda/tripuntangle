import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateOOO(
  tripName: string,
  destination: string,
  recommendedDates: string,
  memberNames: string[],
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.9,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: `You write short, witty, light-hearted out-of-office email replies for travellers.
Tone: warm, humorous, like a well-travelled friend — never corporate.
Format: plain text, under 100 words, ready to copy-paste as an email body.
Do not include subject line. Do not include "Subject:". Just the email body.`,
      },
      {
        role: 'user',
        content: `Write an OOO email for someone going on a trip called "${tripName}" to ${destination} with friends (${memberNames.join(', ')}).
Travel dates: ${recommendedDates}.
Make it fun and mention that they're busy untangling the perfect group itinerary with AI.`,
      },
    ],
  })
  return response.choices[0].message.content ?? ''
}
