import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware'
import { prisma } from '../lib/prisma'
import { generateChatReply } from '../services/chat.service'
import { io } from '../index'
import { emitToTrip } from '../lib/socket'

export const chatRouter = Router()

const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a moment.' },
})

// GET /api/trips/:id/chat — load message history
chatRouter.get('/trips/:id/chat', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member.' }); return }

  const messages = await prisma.chatMessage.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { sender: { select: { name: true, avatarUrl: true } } },
  })
  res.json(messages)
})

// POST /api/trips/:id/chat — send a message
chatRouter.post('/trips/:id/chat', requireAuth, chatLimiter, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const { content } = z.object({ content: z.string().min(1).max(1000) }).parse(req.body)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
    include: { user: { select: { name: true, avatarUrl: true } } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member.' }); return }

  // Save user message
  const userMsg = await prisma.chatMessage.create({
    data: { tripId, senderType: 'USER', senderId: req.userId!, content },
    include: { sender: { select: { name: true, avatarUrl: true } } },
  })

  emitToTrip(io, tripId, 'chat:message', userMsg)
  res.json({ ok: true, messageId: userMsg.id })

  // Generate AI reply in background (don't await)
  setImmediate(async () => {
    try {
      emitToTrip(io, tripId, 'chat:thinking', { tripId })

      const reply = await generateChatReply(tripId, content)

      const aiMsg = await prisma.chatMessage.create({
        data: { tripId, senderType: 'AI', senderId: null, content: reply },
        include: { sender: { select: { name: true, avatarUrl: true } } },
      })
      emitToTrip(io, tripId, 'chat:message', aiMsg)
    } catch (err) {
      console.error('[Chat] AI reply failed:', err)
      emitToTrip(io, tripId, 'chat:error', { error: 'AI failed to respond.' })
    }
  })
})

// GET /api/trips/:id/group-messages — load group chat history
chatRouter.get('/trips/:id/group-messages', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member.' }); return }

  const messages = await prisma.groupMessage.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })
  res.json(messages)
})

// POST /api/trips/:id/group-messages — send a group message
chatRouter.post('/trips/:id/group-messages', requireAuth, chatLimiter, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const { content } = z.object({ content: z.string().min(1).max(1000) }).parse(req.body)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member.' }); return }

  const msg = await prisma.groupMessage.create({
    data: { tripId, senderId: req.userId!, content },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })

  emitToTrip(io, tripId, 'group:message', msg)
  res.json({ ok: true, message: msg })
})

// POST /api/trips/:id/vote — cast or remove a vote on an activity
chatRouter.post('/trips/:id/vote', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const { activityId, itineraryId, value } = z.object({
    activityId:  z.string(),
    itineraryId: z.string(),
    value:       z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'REMOVE']),
  }).parse(req.body)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member.' }); return }

  if (value === 'REMOVE') {
    await prisma.vote.deleteMany({
      where: { tripMemberId: member.id, itineraryId, activityId },
    })
  } else {
    await prisma.vote.upsert({
      where: { tripMemberId_itineraryId_activityId: { tripMemberId: member.id, itineraryId, activityId } },
      update: { value },
      create: { tripMemberId: member.id, itineraryId, activityId, value, tripId },
    })
  }

  // Get updated counts for this activity
  const counts = await getActivityVoteCounts(itineraryId, activityId)
  emitToTrip(io, tripId, 'vote:update', { activityId, itineraryId, counts })
  res.json({ ok: true, counts })
})

// GET /api/trips/:id/votes — get all vote counts for the latest itinerary
chatRouter.get('/trips/:id/votes', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member.' }); return }

  const itinerary = await prisma.itinerary.findFirst({
    where: { tripId },
    orderBy: { version: 'desc' },
    select: { id: true },
  })
  if (!itinerary) { res.json({}); return }

  const votes = await prisma.vote.findMany({
    where: { itineraryId: itinerary.id },
  })

  // Build map: activityId → { up, down, myVote }
  const map: Record<string, { up: number; down: number; myVote: string | null }> = {}
  for (const v of votes) {
    if (!map[v.activityId]) map[v.activityId] = { up: 0, down: 0, myVote: null }
    if (v.value === 'THUMBS_UP') map[v.activityId].up++
    else map[v.activityId].down++
    if (v.tripMemberId === member.id) map[v.activityId].myVote = v.value
  }

  res.json({ itineraryId: itinerary.id, votes: map })
})

async function getActivityVoteCounts(itineraryId: string, activityId: string) {
  const votes = await prisma.vote.findMany({ where: { itineraryId, activityId } })
  return {
    up:    votes.filter((v) => v.value === 'THUMBS_UP').length,
    down:  votes.filter((v) => v.value === 'THUMBS_DOWN').length,
  }
}
