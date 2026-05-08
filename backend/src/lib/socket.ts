import { Server } from 'socket.io'

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    socket.on('join-trip', (tripId: string) => {
      socket.join(`trip:${tripId}`)
    })
    socket.on('leave-trip', (tripId: string) => {
      socket.leave(`trip:${tripId}`)
    })
  })
}

export function emitToTrip(io: Server, tripId: string, event: string, data: unknown) {
  io.to(`trip:${tripId}`).emit(event, data)
}
