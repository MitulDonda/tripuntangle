import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { Server as SocketServer } from 'socket.io'

import './lib/passport'          // register Google strategy
import { authRouter } from './routes/auth.routes'
import { tripsRouter } from './routes/trips.routes'
import { chatRouter } from './routes/chat.routes'
import { exportRouter } from './routes/export.routes'
import { setupSocketHandlers } from './lib/socket'
import { startGenerationWorker } from './workers/generation.worker'

const app = express()
const httpServer = http.createServer(app)

export const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/api', tripsRouter)
app.use('/api', chatRouter)
app.use('/api', exportRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

setupSocketHandlers(io)
startGenerationWorker(io)

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`TripUntangle backend → http://localhost:${PORT}`)
})
