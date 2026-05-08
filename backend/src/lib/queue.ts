import { Queue } from 'bullmq'
import { redis } from './redis'

export const generationQueue = new Queue('itinerary-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
})
