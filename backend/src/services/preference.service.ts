import { prisma } from '../lib/prisma'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { BudgetTier, Vibe, Dietary } from '@prisma/client'

const ALGO = 'aes-256-cbc'
const KEY = Buffer.from(process.env.JWT_SECRET!.slice(0, 64).padEnd(64, '0'), 'hex').slice(0, 32)

export function encryptText(plain: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptText(cipher: string): string {
  const [ivHex, encHex] = cipher.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv(ALGO, KEY, iv)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

export interface PreferenceInput {
  availStart: string
  availEnd: string
  durationDays: number
  budgetTier: BudgetTier
  vibes: Vibe[]
  dietary: Dietary[]
  wildcardText?: string
}

export async function upsertPreference(tripMemberId: string, data: PreferenceInput) {
  const wildcardEncrypted = data.wildcardText
    ? encryptText(data.wildcardText)
    : null

  return prisma.preference.upsert({
    where: { tripMemberId },
    update: {
      availStart: new Date(data.availStart),
      availEnd: new Date(data.availEnd),
      durationDays: data.durationDays,
      budgetTier: data.budgetTier,
      vibes: data.vibes,
      dietary: data.dietary,
      wildcardText: wildcardEncrypted,
    },
    create: {
      tripMemberId,
      availStart: new Date(data.availStart),
      availEnd: new Date(data.availEnd),
      durationDays: data.durationDays,
      budgetTier: data.budgetTier,
      vibes: data.vibes,
      dietary: data.dietary,
      wildcardText: wildcardEncrypted,
    },
  })
}

export async function getPreference(tripMemberId: string) {
  const pref = await prisma.preference.findUnique({ where: { tripMemberId } })
  if (!pref) return null
  return {
    ...pref,
    wildcardText: pref.wildcardText ? decryptText(pref.wildcardText) : null,
  }
}

export async function getTripMemberPreferences(tripId: string) {
  const members = await prisma.tripMember.findMany({
    where: { tripId, inviteStatus: 'ACCEPTED' },
    include: { preference: true, user: { select: { name: true } } },
  })
  return members.map((m, i) => ({
    label: `Member ${i + 1}`,   // PII-safe label for LLM
    hasSubmitted: !!m.preference,
    preference: m.preference
      ? {
          ...m.preference,
          wildcardText: m.preference.wildcardText
            ? decryptText(m.preference.wildcardText)
            : null,
        }
      : null,
  }))
}
