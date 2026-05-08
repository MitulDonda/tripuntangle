import { Router } from 'express'
import passport from '../lib/passport'
import { setAuthCookie, clearAuthCookie } from '../lib/jwt'
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware'
import { prisma } from '../lib/prisma'
import type { User } from '@prisma/client'

export const authRouter = Router()

// Step 1: Redirect to Google
authRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

// Step 2: Google redirects back here
authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
  (req, res) => {
    const user = req.user as User
    setAuthCookie(res, { userId: user.id, email: user.email })
    // If user came from an invite link, redirect back to it
    const state = (req.query.state as string) || ''
    const inviteMatch = state.match(/^invite:(.+)$/)
    if (inviteMatch) {
      res.redirect(`${process.env.FRONTEND_URL}/join/${inviteMatch[1]}`)
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`)
    }
  }
)

// Get current authenticated user
authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  })
  res.json(user)
})

// Logout
authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})
