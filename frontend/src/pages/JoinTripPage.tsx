import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTripByInviteCode, useJoinTrip } from '../hooks/useInvite'
import { useAuth } from '../hooks/useAuth'

export default function JoinTripPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: trip, isLoading: tripLoading, isError } = useTripByInviteCode(inviteCode)
  const joinTrip = useJoinTrip()

  // If not logged in, redirect to Google OAuth preserving the invite code
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem('pendingInvite', inviteCode ?? '')
      window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/auth/google`
    }
  }, [authLoading, isAuthenticated, inviteCode])

  // Auto-join once authenticated and trip data is loaded
  useEffect(() => {
    if (isAuthenticated && trip && !joinTrip.isPending && !joinTrip.isSuccess) {
      joinTrip.mutate(inviteCode!, {
        onSuccess: (data) => navigate(`/trips/${data.tripId}`),
      })
    }
  }, [isAuthenticated, trip, inviteCode, navigate, joinTrip])

  if (authLoading || tripLoading || joinTrip.isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
           style={{ background: 'var(--bg-base)' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--accent-forest)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Joining trip…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
           style={{ background: 'var(--bg-base)' }}>
        <div className="text-4xl">🔗</div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Invalid or expired link
        </h1>
        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          This invite link is no longer valid. Ask the trip creator to send a new one.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent-forest)', color: '#fff' }}
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  if (trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
           style={{ background: 'var(--bg-base)' }}>
        <div className="text-4xl">✈️</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {trip.name}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>📍 {trip.destination}</p>
        <div className="w-8 h-8 rounded-full border-2 animate-spin mt-2"
             style={{ borderColor: 'var(--accent-forest)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return null
}
