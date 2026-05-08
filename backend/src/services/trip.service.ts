import { prisma } from '../lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { customAlphabet } from 'nanoid'

const shortId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

export async function createTrip(
  ownerId: string,
  data: { name: string; destination: string; travelStart?: string; travelEnd?: string }
) {
  const inviteCode = uuidv4()
  const shortCode = shortId()
  const inviteExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  return prisma.trip.create({
    data: {
      name: data.name,
      destination: data.destination,
      travelStart: data.travelStart ? new Date(data.travelStart) : null,
      travelEnd: data.travelEnd ? new Date(data.travelEnd) : null,
      inviteCode,
      shortCode,
      inviteExpiry,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
          inviteStatus: 'ACCEPTED',
          joinedAt: new Date(),
        },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
  })
}

export async function getTripsByUser(userId: string) {
  return prisma.trip.findMany({
    where: { members: { some: { userId, inviteStatus: 'ACCEPTED' } } },
    include: {
      members: {
        where: { inviteStatus: 'ACCEPTED' },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        take: 6,
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getTripById(tripId: string, userId: string) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      members: { some: { userId } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
      },
      itineraries: { orderBy: { version: 'desc' }, take: 1 },
    },
  })
  return trip
}

export async function getUserRole(tripId: string, userId: string) {
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  })
  return member?.role ?? null
}
