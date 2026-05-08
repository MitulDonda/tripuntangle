import jwt from 'jsonwebtoken'
import type { Response } from 'express'

const SECRET = process.env.JWT_SECRET!
const COOKIE_NAME = 'tu_token'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export interface JwtPayload {
  userId: string
  email: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function setAuthCookie(res: Response, payload: JwtPayload) {
  const token = signToken(payload)
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    // 'none' required for cross-domain (Vercel frontend ↔ Render backend)
    // 'lax' for local dev (same origin)
    sameSite: isProd ? 'none' : 'lax',
    maxAge: THIRTY_DAYS_MS,
  })
  return token
}

export function clearAuthCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  })
}

export { COOKIE_NAME }
