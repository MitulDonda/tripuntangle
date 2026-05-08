import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Warm up the connection on startup so the first user request doesn't hit a cold Neon DB
prisma.$connect()
  .then(() => console.log('[Prisma] Database connected'))
  .catch((e) => console.error('[Prisma] Connection failed on startup:', e.message))

/**
 * Retry a Prisma call up to `retries` times with exponential back-off.
 * Useful for Neon free-tier cold starts that can take 5–15 s.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const isConnErr =
        err?.message?.includes("Can't reach database") ||
        err?.code === 'P1001' ||
        err?.code === 'P1002'
      if (!isConnErr || attempt === retries) throw err
      console.warn(`[Prisma] DB unreachable, retry ${attempt}/${retries} in ${delayMs}ms…`)
      await new Promise((r) => setTimeout(r, delayMs * attempt))
    }
  }
  throw lastErr
}
