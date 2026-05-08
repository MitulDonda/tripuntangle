import { Worker } from 'bullmq'
import type { Server } from 'socket.io'
import { redis } from '../lib/redis'
import { prisma, withRetry } from '../lib/prisma'
import { generateItinerary } from '../services/ai.service'
import { emitToTrip } from '../lib/socket'

export function startGenerationWorker(io: Server) {
  const worker = new Worker(
    'itinerary-generation',
    async (job) => {
      const { tripId } = job.data as { tripId: string }

      // Mark trip as generating (retry on cold-start)
      await withRetry(() => prisma.trip.update({
        where: { id: tripId },
        data: { status: 'GENERATING' },
      }))
      emitToTrip(io, tripId, 'generation:started', { tripId })

      try {
        const content = await generateItinerary(tripId)

        // Get current version count
        const existing = await withRetry(() => prisma.itinerary.findFirst({
          where: { tripId },
          orderBy: { version: 'desc' },
          select: { version: true },
        }))
        const nextVersion = (existing?.version ?? 0) + 1

        const itinerary = await withRetry(() => prisma.itinerary.create({
          data: { tripId, content: content as object, version: nextVersion },
        }))

        await withRetry(() => prisma.trip.update({
          where: { id: tripId },
          data: { status: 'FINALISED' },
        }))

        emitToTrip(io, tripId, 'generation:complete', {
          tripId,
          itineraryId: itinerary.id,
          content,
        })
      } catch (err) {
        // Revert status on failure
        await prisma.trip.update({
          where: { id: tripId },
          data: { status: 'PLANNING' },
        }).catch(() => {})
        emitToTrip(io, tripId, 'generation:error', {
          tripId,
          error: err instanceof Error ? err.message : 'Generation failed',
        })
        throw err
      }
    },
    { connection: redis, concurrency: 3 }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message)
  })

  console.log('[Worker] Generation worker started')
  return worker
}
