import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware'
import { createTrip, getTripsByUser, getTripById, getUserRole } from '../services/trip.service'
import { refineItinerary } from '../services/ai.service'
import { prisma } from '../lib/prisma'
import { sendInviteEmail } from '../services/email.service'
import { upsertPreference, getPreference } from '../services/preference.service'
import { generationQueue } from '../lib/queue'
import { io } from '../index'
import { emitToTrip } from '../lib/socket'

export const tripsRouter = Router()

const createTripSchema = z.object({
  name: z.string().min(1).max(60),
  destination: z.string().min(1),
  travelStart: z.string().optional(),
  travelEnd: z.string().optional(),
})

// POST /api/trips — create a new trip
tripsRouter.post('/trips', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createTripSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  try {
    const trip = await createTrip(req.userId!, parsed.data)
    res.status(201).json(trip)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create trip' })
  }
})

// GET /api/trips — list trips for current user
tripsRouter.get('/trips', requireAuth, async (req: AuthRequest, res) => {
  try {
    const trips = await getTripsByUser(req.userId!)
    res.json(trips)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch trips' })
  }
})

// POST /api/trips/:id/invite — send email invites (Owner only)
tripsRouter.post('/trips/:id/invite', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const role = await getUserRole(tripId, req.userId!)
  if (role !== 'OWNER') {
    res.status(403).json({ error: 'Only the trip owner can invite members.' })
    return
  }

  const { emails } = z.object({ emails: z.array(z.string().email()).min(1).max(20) }).parse(req.body)

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { members: { include: { user: true } } },
  })
  if (!trip) { res.status(404).json({ error: 'Trip not found' }); return }

  const owner = trip.members.find((m) => m.role === 'OWNER')
  const frontendUrl = process.env.FRONTEND_URL!
  const inviteUrl = `${frontendUrl}/join/${trip.inviteCode}`

  const results = await Promise.allSettled(
    emails.map(async (email) => {
      // Skip if already a member
      const existing = await prisma.tripMember.findFirst({
        where: { tripId, user: { email } },
      })
      if (existing) return { email, status: 'already_member', inviteUrl }

      // Upsert pending invite record (user may not exist yet)
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        await prisma.tripMember.upsert({
          where: { tripId_userId: { tripId, userId: existingUser.id } },
          update: {},
          create: { tripId, userId: existingUser.id, role: 'MEMBER', inviteStatus: 'PENDING', inviteEmail: email },
        })
      }

      try {
        await sendInviteEmail({
          to: email,
          tripName: trip.name,
          destination: trip.destination,
          creatorName: owner?.user.name ?? 'Someone',
          inviteUrl,
        })
        return { email, status: 'sent', inviteUrl }
      } catch (err: any) {
        console.error(`[Invite] Email to ${email} failed:`, err.message)
        // Still record the invite — return the link so owner can share manually
        return { email, status: 'email_failed', reason: err.message, inviteUrl }
      }
    })
  )

  res.json({
    inviteUrl,
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message, inviteUrl })),
  })
})

// GET /api/join/:code — look up trip by inviteCode (UUID) or shortCode (6-char), public
tripsRouter.get('/join/:code', async (req, res) => {
  const code = String(req.params.code).trim()
  const trip = await prisma.trip.findFirst({
    where: { OR: [{ inviteCode: code }, { shortCode: code.toUpperCase() }] },
    select: { id: true, name: true, destination: true, status: true, inviteExpiry: true, shortCode: true, inviteCode: true, members: { select: { id: true } } },
  })
  if (!trip) { res.status(404).json({ error: 'Invalid or expired invite code.' }); return }
  if (new Date() > trip.inviteExpiry) { res.status(410).json({ error: 'This invite has expired.' }); return }
  res.json({ id: trip.id, name: trip.name, destination: trip.destination, status: trip.status, shortCode: trip.shortCode, inviteCode: trip.inviteCode, memberCount: trip.members.length })
})

// POST /api/join/:code — authenticated user joins a trip (by inviteCode or shortCode)
tripsRouter.post('/join/:code', requireAuth, async (req: AuthRequest, res) => {
  const code = String(req.params.code).trim()
  const trip = await prisma.trip.findFirst({
    where: { OR: [{ inviteCode: code }, { shortCode: code.toUpperCase() }] },
  })
  if (!trip) { res.status(404).json({ error: 'Invalid invite code.' }); return }
  if (new Date() > trip.inviteExpiry) { res.status(410).json({ error: 'Invite has expired.' }); return }

  const existing = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: req.userId! } },
  })
  if (existing?.inviteStatus === 'ACCEPTED') {
    res.json({ tripId: trip.id, alreadyMember: true })
    return
  }

  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: req.userId! } },
    update: { inviteStatus: 'ACCEPTED', joinedAt: new Date() },
    create: {
      tripId: trip.id,
      userId: req.userId!,
      role: 'MEMBER',
      inviteStatus: 'ACCEPTED',
      joinedAt: new Date(),
    },
  })
  res.json({ tripId: trip.id, alreadyMember: false })
})

// GET /api/trips/:id — get single trip
tripsRouter.get('/trips/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const trip = await getTripById(String(req.params.id), req.userId!)
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' })
      return
    }
    res.json(trip)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch trip' })
  }
})

// ─── Preference endpoints ──────────────────────────────────────────────────

const preferenceSchema = z.object({
  availStart:   z.string(),
  availEnd:     z.string(),
  durationDays: z.number().int().min(3).max(14),
  budgetTier:   z.enum(['BACKPACKER', 'FLASHPACKER', 'LUXURY']),
  vibes:        z.array(z.enum(['NIGHTLIFE','NATURE','ADVENTURE','RELAXATION','CULTURE','FOOD_AND_DRINK','WELLNESS'])).min(1).max(3),
  dietary:      z.array(z.enum(['VEGETARIAN','VEGAN','NON_VEGETARIAN','GLUTEN_FREE','NUT_ALLERGY','OTHER'])),
  wildcardText: z.string().max(300).optional(),
})

// POST /api/trips/:id/preferences — submit or update preferences
tripsRouter.post('/trips/:id/preferences', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  // Confirm member belongs to this trip
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member of this trip.' }); return }

  // Block edits after generation starts
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { status: true } })
  if (trip?.status !== 'PLANNING') {
    res.status(409).json({ error: 'Preferences cannot be edited after generation has started.' })
    return
  }

  const parsed = preferenceSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  // Mark member as ACCEPTED if they were pending
  if (member.inviteStatus === 'PENDING') {
    await prisma.tripMember.update({
      where: { id: member.id },
      data: { inviteStatus: 'ACCEPTED', joinedAt: new Date() },
    })
  }

  const pref = await upsertPreference(member.id, parsed.data)
  res.json({ ok: true, preferenceId: pref.id })
})

// GET /api/trips/:id/preferences/me — get my own preferences for this trip
tripsRouter.get('/trips/:id/preferences/me', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member of this trip.' }); return }

  const pref = await getPreference(member.id)
  res.json(pref ?? null)
})

// POST /api/trips/:id/generate — enqueue AI itinerary generation (Owner only)
tripsRouter.post('/trips/:id/generate', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const role = await getUserRole(tripId, req.userId!)
  if (role !== 'OWNER') {
    res.status(403).json({ error: 'Only the trip owner can generate the itinerary.' })
    return
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { status: true },
  })
  if (!trip) { res.status(404).json({ error: 'Trip not found' }); return }
  if (trip.status === 'GENERATING') {
    // Allow owner to force-reset a stuck generation after 2 minutes
    res.status(409).json({ error: 'Generation already in progress. If stuck, wait a moment and try again.' })
    return
  }

  // Check at least one preference submitted
  const prefCount = await prisma.preference.count({
    where: { member: { tripId } },
  })
  if (prefCount === 0) {
    res.status(400).json({ error: 'At least one member must submit preferences before generating.' })
    return
  }

  await generationQueue.add('generate', { tripId }, { jobId: `gen-${tripId}-${Date.now()}` })
  res.json({ ok: true, message: 'Generation queued.' })
})

// POST /api/trips/:id/reset-status — force trip back to PLANNING if stuck (Owner only)
tripsRouter.post('/trips/:id/reset-status', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const role = await getUserRole(tripId, req.userId!)
  if (role !== 'OWNER') { res.status(403).json({ error: 'Owner only.' }); return }

  await prisma.trip.update({
    where: { id: tripId },
    data: { status: 'PLANNING' },
  })
  res.json({ ok: true })
})

// POST /api/trips/:id/refine — refine itinerary with a natural-language instruction (any member)
tripsRouter.post('/trips/:id/refine', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member of this trip.' }); return }

  const { instruction } = z.object({ instruction: z.string().min(1).max(500) }).parse(req.body)

  try {
    const updated = await refineItinerary(tripId, instruction)

    // Save as new version
    const latest = await prisma.itinerary.findFirst({
      where: { tripId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const newItinerary = await prisma.itinerary.create({
      data: { tripId, version: (latest?.version ?? 0) + 1, content: updated as any },
    })

    emitToTrip(io, tripId, 'itinerary:updated', { itineraryId: newItinerary.id })
    res.json({ ok: true, itineraryId: newItinerary.id })
  } catch (err: any) {
    console.error('[Refine] Failed:', err.message)
    res.status(500).json({ error: 'Failed to refine itinerary. Try again.' })
  }
})

// DELETE /api/trips/:id — permanently delete trip (Owner only)
tripsRouter.delete('/trips/:id', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)
  const role = await getUserRole(tripId, req.userId!)
  if (role !== 'OWNER') {
    res.status(403).json({ error: 'Only the trip owner can delete this trip.' })
    return
  }
  try {
    await prisma.trip.delete({ where: { id: tripId } })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete trip.' })
  }
})

// GET /api/trips/:id/itinerary — get latest itinerary for trip
tripsRouter.get('/trips/:id/itinerary', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member of this trip.' }); return }

  const itinerary = await prisma.itinerary.findFirst({
    where: { tripId },
    orderBy: { version: 'desc' },
  })
  res.json(itinerary ?? null)
})

// GET /api/trips/:id/votes — get all votes for the latest itinerary (with current user's vote)
tripsRouter.get('/trips/:id/votes', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member of this trip.' }); return }

  const itinerary = await prisma.itinerary.findFirst({
    where: { tripId },
    orderBy: { version: 'desc' },
    select: { id: true },
  })
  if (!itinerary) { res.json({ itineraryId: null, votes: {} }); return }

  const allVotes = await prisma.vote.findMany({
    where: { itineraryId: itinerary.id },
  })

  // Group by activityId: count up/down + find current user's own vote
  const votes: Record<string, { up: number; down: number; myVote: string | null }> = {}
  for (const v of allVotes) {
    if (!votes[v.activityId]) votes[v.activityId] = { up: 0, down: 0, myVote: null }
    if (v.value === 'THUMBS_UP')   votes[v.activityId].up++
    if (v.value === 'THUMBS_DOWN') votes[v.activityId].down++
    if (v.tripMemberId === member.id) votes[v.activityId].myVote = v.value
  }

  res.json({ itineraryId: itinerary.id, votes })
})

// POST /api/trips/:id/vote — cast or remove a vote on an activity
tripsRouter.post('/trips/:id/vote', requireAuth, async (req: AuthRequest, res) => {
  const tripId = String(req.params.id)

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  })
  if (!member) { res.status(403).json({ error: 'Not a member of this trip.' }); return }

  const parsed = z.object({
    activityId:  z.string().min(1),
    itineraryId: z.string().min(1),
    value:       z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'REMOVE']),
  }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid vote payload', details: parsed.error.flatten() }); return }

  const { activityId, itineraryId, value } = parsed.data

  if (value === 'REMOVE') {
    await prisma.vote.deleteMany({
      where: { tripMemberId: member.id, itineraryId, activityId },
    })
  } else {
    await prisma.vote.upsert({
      where: { tripMemberId_itineraryId_activityId: { tripMemberId: member.id, itineraryId, activityId } },
      update: { value, tripId },
      create: { tripMemberId: member.id, itineraryId, activityId, value, tripId },
    })
  }

  // Return updated counts for this activity
  const updatedVotes = await prisma.vote.findMany({
    where: { itineraryId, activityId },
  })
  const counts = {
    up:     updatedVotes.filter((v) => v.value === 'THUMBS_UP').length,
    down:   updatedVotes.filter((v) => v.value === 'THUMBS_DOWN').length,
    myVote: value === 'REMOVE' ? null : value,
  }

  // Broadcast real-time update to all trip members
  emitToTrip(io, tripId, 'vote:update', { activityId, itineraryId, counts })

  res.json({ ok: true, counts })
})
