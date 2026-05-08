import Redis from 'ioredis'

const url = process.env.REDIS_URL!

export const redis = new Redis(url, {
  maxRetriesPerRequest: null,  // required by BullMQ
  tls: url.startsWith('rediss://') ? {} : undefined,
})

redis.on('error', (err) => console.error('Redis error:', err.message))
