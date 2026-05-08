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
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',   // 'lax' allows redirect from Google back to app
    maxAge: THIRTY_DAYS_MS,
  })
  return token
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME)
}

export { COOKIE_NAME }
