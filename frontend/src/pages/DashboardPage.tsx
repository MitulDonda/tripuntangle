import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTrips } from '../hooks/useTrips'
import { useTheme } from '../hooks/useTheme'
import TripCard from '../components/TripCard'
import CreateTripModal from '../components/CreateTripModal'
import JoinTripModal from '../components/JoinTripModal'
import axios from 'axios'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: trips, isLoading } = useTrips()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin]     = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  const totalTrips     = trips?.length ?? 0
  const planningCount  = trips?.filter((t) => t.status === 'PLANNING').length ?? 0
  const finalisedCount = trips?.filter((t) => t.status === 'FINALISED').length ?? 0
  const firstName      = user?.name?.split(' ')[0] ?? ''

  async function handleLogout() {
    await axios.post('/auth/logout', {}, { withCredentials: true })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                 style={{ background: 'linear-gradient(135deg, var(--accent-forest-bg), transparent)', border: '1px solid rgba(74,155,111,0.3)' }}>
              ✈️
            </div>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              TripUntangle
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name}
                   className="w-8 h-8 rounded-full"
                   style={{ outline: '2px solid var(--accent-forest)', outlineOffset: '2px' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                   style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                {user?.name?.[0] ?? '?'}
              </div>
            )}
            <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg transition hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'Sora, sans-serif' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Hero banner ──────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden mb-10 animate-fade-in-up"
             style={{ background: 'linear-gradient(135deg, var(--hero-grad-from) 0%, var(--hero-grad-to) 100%)', border: '1px solid var(--border)' }}>

          {/* Decorative concentric arcs */}
          <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none overflow-hidden">
            {[280, 220, 160, 100].map((size, i) => (
              <div key={i} className="absolute top-1/2 right-8"
                   style={{
                     width: size, height: size,
                     borderRadius: '50%',
                     border: `1px solid ${i % 2 === 0 ? 'rgba(74,155,111,0.12)' : 'rgba(201,165,90,0.1)'}`,
                     transform: 'translateY(-50%)',
                   }} />
            ))}
          </div>

          <div className="relative z-10 px-8 py-7">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3"
               style={{ color: 'var(--accent-gold)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.15em' }}>
              Your journeys
            </p>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {firstName ? (
                <>Good to see you, <em style={{ fontStyle: 'italic', color: 'var(--accent-forest)' }}>{firstName}</em> 👋</>
              ) : 'Welcome back 👋'}
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', fontWeight: 300 }}>
              Your next adventure is waiting to be untangled.
            </p>

            {totalTrips > 0 && (
              <div className="flex gap-3 mt-5">
                <StatChip label="Trips" value={totalTrips} color="var(--accent-forest)" bg="var(--stat-chip-bg)" border="var(--stat-chip-border)" />
                <StatChip label="Planning" value={planningCount} color="var(--accent-sun)" bg="rgba(245,166,35,0.08)" border="rgba(245,166,35,0.2)" />
                <StatChip label="Finalised" value={finalisedCount} color="var(--accent-sky)" bg="rgba(91,155,213,0.08)" border="rgba(91,155,213,0.2)" />
              </div>
            )}
          </div>
        </div>

        {/* ── Section header ───────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up delay-150">
          <div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              My Trips
            </h2>
            {trips && trips.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
                {trips.length} trip{trips.length !== 1 ? 's' : ''} in your collection
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJoin(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:border-opacity-80"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontFamily: 'Sora, sans-serif',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-forest)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
            >
              🔗 Join Trip
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--accent-forest) 0%, #357a52 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(74,155,111,0.28)',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              <span className="text-base leading-none font-light">+</span>
              New Trip
            </button>
          </div>
        </div>

        {/* ── Trips grid ───────────────────────────────────── */}
        <div className="animate-fade-in-up delay-200">
          {isLoading ? (
            <SkeletonGrid />
          ) : trips && trips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {trips.map((trip, i) => (
                <div key={trip.id} className={`animate-fade-in-up`} style={{ animationDelay: `${i * 60}ms` }}>
                  <TripCard trip={trip} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState onNew={() => setShowCreate(true)} />
          )}
        </div>
      </main>

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
      {showJoin   && <JoinTripModal   onClose={() => setShowJoin(false)}   />}
    </div>
  )
}

function StatChip({ label, value, color, bg, border }: { label: string; value: number; color: string; bg: string; border: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
         style={{ background: bg, border: `1px solid ${border}` }}>
      <span className="text-xl font-bold" style={{ color, fontFamily: 'Fraunces, serif' }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>{label}</span>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="skeleton h-40" />
          <div className="p-5 space-y-2.5" style={{ background: 'var(--bg-surface)' }}>
            <div className="skeleton h-4 rounded w-3/4" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="skeleton h-7 rounded-full w-24 mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl p-16 text-center relative overflow-hidden"
         style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)' }}>
      {/* Subtle decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full"
             style={{ background: 'radial-gradient(circle, var(--accent-forest-bg) 0%, transparent 70%)', opacity: 0.6 }} />
      </div>
      <div className="relative z-10">
        <div className="text-5xl mb-5 inline-block">🗺️</div>
        <h3 className="text-xl font-semibold mb-2"
            style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', fontWeight: 600 }}>
          No trips yet
        </h3>
        <p className="text-sm mb-7" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', fontWeight: 300 }}>
          Create your first trip and invite your travel crew.
        </p>
        <button
          onClick={onNew}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--accent-forest) 0%, #357a52 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(74,155,111,0.28)',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          + Create a Trip
        </button>
      </div>
    </div>
  )
}
