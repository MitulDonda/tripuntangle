import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLookupTrip, useJoinTrip } from '../hooks/useTrips'

interface Props {
  onClose: () => void
}

export default function JoinTripModal({ onClose }: Props) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const lookup = useLookupTrip()
  const join   = useJoinTrip()

  const trip = lookup.data
  const error = (lookup.error as any)?.response?.data?.error
              ?? (join.error as any)?.response?.data?.error

  async function handleLookup() {
    if (!code.trim()) return
    lookup.reset()
    await lookup.mutateAsync(code)
  }

  async function handleJoin() {
    if (!trip) return
    const result = await join.mutateAsync(trip.inviteCode)
    onClose()
    navigate(`/trips/${result.tripId}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !trip) handleLookup()
  }

  const statusLabels: Record<string, string> = {
    PLANNING: 'Planning', GENERATING: 'Generating',
    FINALISED: 'Finalised', ARCHIVED: 'Archived',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            🔗 Join a Trip
          </h2>
          <button onClick={onClose} className="text-xl transition hover:opacity-60"
                  style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Code input */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Invite Code or Short Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. BALI42 or full invite link code"
              value={code}
              onChange={(e) => { setCode(e.target.value); lookup.reset(); join.reset() }}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleLookup}
              disabled={!code.trim() || lookup.isPending}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-40 shrink-0"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {lookup.isPending ? '…' : 'Look up'}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Ask the trip owner for the 6-character short code or full invite link
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2.5 rounded-lg text-sm"
               style={{ background: 'var(--accent-bloom-bg)', border: '1px solid var(--accent-bloom)', color: 'var(--accent-bloom)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Trip preview */}
        {trip && !error && (
          <div className="rounded-xl p-4 flex flex-col gap-3"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {trip.name}
                </p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>📍 {trip.destination}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                    style={{ background: trip.status === 'FINALISED' ? 'var(--accent-forest-bg)' : 'var(--accent-sun-bg)',
                             color: trip.status === 'FINALISED' ? 'var(--accent-forest)' : 'var(--accent-sun)' }}>
                {statusLabels[trip.status] ?? trip.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>👥 {trip.memberCount} member{trip.memberCount !== 1 ? 's' : ''}</span>
              <span>Code: <strong style={{ color: 'var(--accent-sun)' }}>{trip.shortCode}</strong></span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={!trip || join.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--accent-forest)', color: '#fff' }}
          >
            {join.isPending ? 'Joining…' : 'Join Trip'}
          </button>
        </div>
      </div>
    </div>
  )
}
