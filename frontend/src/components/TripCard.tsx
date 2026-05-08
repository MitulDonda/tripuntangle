import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Trip } from '../hooks/useTrips'

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') !== 'light'
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light')
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

const STATUS_STYLES: Record<Trip['status'], { label: string; bg: string; color: string; dot: string }> = {
  PLANNING:   { label: 'Planning',   bg: 'rgba(74,155,111,0.15)',  color: 'var(--accent-forest)', dot: 'var(--accent-forest)' },
  GENERATING: { label: 'Generating', bg: 'rgba(245,166,35,0.15)',  color: 'var(--accent-sun)',    dot: 'var(--accent-sun)'    },
  FINALISED:  { label: 'Finalised',  bg: 'rgba(91,155,213,0.15)',  color: 'var(--accent-sky)',    dot: 'var(--accent-sky)'    },
  ARCHIVED:   { label: 'Archived',   bg: 'rgba(122,136,118,0.15)', color: 'var(--text-muted)',    dot: 'var(--text-muted)'    },
}

// Deep, moody gradients for dark theme
const DARK_GRADIENTS = [
  ['#0e2218', '#112233', '74,155,111'],
  ['#1e1228', '#0e1a22', '150,100,200'],
  ['#241408', '#1a1428', '201,165,90'],
  ['#0e1e2e', '#0e221e', '91,155,213'],
  ['#201020', '#0e1e20', '198,93,123'],
  ['#0e1c10', '#141c10', '74,155,111'],
  ['#1e1410', '#101428', '201,165,90'],
]

// Soft, airy gradients for light theme
const LIGHT_GRADIENTS = [
  ['#c8e8d8', '#b8d8f0', '45,122,80'],     // sage mint → sky
  ['#b8d0f0', '#d0c8f0', '26,90,180'],     // periwinkle → lavender
  ['#f0dfc0', '#c8e8d0', '154,100,26'],    // warm sand → mint
  ['#c0d8f4', '#c8f0e8', '26,80,180'],     // soft blue → seafoam
  ['#f0c8d8', '#d0c0f0', '180,60,100'],    // blush → lilac
  ['#c8f0d8', '#d8f0c8', '45,140,80'],     // fresh mint → lime
  ['#f0e0c0', '#f0c8c0', '160,100,30'],    // cream → peach
]

function destinationGradient(destination: string, dark: boolean) {
  let hash = 0
  for (let i = 0; i < destination.length; i++) hash = destination.charCodeAt(i) + ((hash << 5) - hash)
  const pool = dark ? DARK_GRADIENTS : LIGHT_GRADIENTS
  const [from, to, rgb] = pool[Math.abs(hash) % pool.length]
  return { from, to, rgb }
}

function destinationEmoji(destination: string) {
  const d = destination.toLowerCase()
  if (d.match(/japan|tokyo|kyoto|osaka/)) return '🗾'
  if (d.match(/paris|france/)) return '🗼'
  if (d.match(/india|delhi|mumbai|goa/)) return '🕌'
  if (d.match(/bali|indonesia/)) return '🌴'
  if (d.match(/london|uk|england/)) return '🎡'
  if (d.match(/new york|usa|america/)) return '🗽'
  if (d.match(/beach|island|maldives|hawaii/)) return '🏖️'
  if (d.match(/mountain|alps|himalaya|swiss/)) return '🏔️'
  if (d.match(/dubai|uae/)) return '🌆'
  if (d.match(/italy|rome|venice|amalfi/)) return '🏛️'
  if (d.match(/thailand|bangkok/)) return '🛕'
  if (d.match(/spain|barcelona|madrid/)) return '🎭'
  if (d.match(/greece|santorini|athens/)) return '🏛️'
  if (d.match(/africa|safari|kenya/)) return '🦁'
  return '✈️'
}

interface Props {
  trip: Trip
}

export default function TripCard({ trip }: Props) {
  const navigate = useNavigate()
  const isDark = useIsDark()
  const status = STATUS_STYLES[trip.status]
  const acceptedMembers = trip.members.filter((m) => m.inviteStatus === 'ACCEPTED')
  const shownMembers = acceptedMembers.slice(0, 4)
  const overflow = acceptedMembers.length - 4
  const { from, to, rgb } = destinationGradient(trip.destination, isDark)

  const dateRange = trip.travelStart
    ? `${fmt(trip.travelStart)}${trip.travelEnd ? ` — ${fmt(trip.travelEnd)}` : ''}`
    : null

  return (
    <div
      onClick={() => navigate(`/trips/${trip.id}`)}
      className="card-elegant cursor-pointer group"
      style={{ background: 'var(--bg-surface)', boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* ── Hero ─────────────────────────── */}
      <div className="relative h-44 overflow-hidden rounded-t-2xl card-hero-texture"
           style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}>

        {/* Accent glow */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: `radial-gradient(ellipse 80% 60% at 50% 70%, rgba(${rgb},${isDark ? '0.2' : '0.15'}) 0%, transparent 60%)` }} />

        {/* Large destination emoji */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl select-none transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 drop-shadow-lg">
            {destinationEmoji(trip.destination)}
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.42)',
                  color: '#fff',
                  backdropFilter: 'blur(6px)',
                  fontFamily: 'Sora, sans-serif',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: status.dot }} />
            {status.label}
          </span>
        </div>

        {/* Short code */}
        <div className="absolute top-3 right-3">
          <span className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(0,0,0,0.42)',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'JetBrains Mono, monospace',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontSize: '0.7rem',
                }}>
            {trip.shortCode}
          </span>
        </div>

        {/* Bottom fade into card */}
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
             style={{ background: `linear-gradient(to top, ${isDark ? '#141A16' : '#FAFAF7'} 0%, transparent 100%)` }} />
      </div>

      {/* ── Body ─────────────────────────── */}
      <div className="px-5 pb-5 pt-1">
        <h3 className="font-semibold text-base mb-0.5 truncate leading-snug"
            style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', letterSpacing: '-0.01em' }}>
          {trip.name}
        </h3>
        <p className="text-sm truncate flex items-center gap-1.5"
           style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--accent-forest)', fontSize: '0.75rem' }}>◆</span>
          {trip.destination}
        </p>
        {dateRange && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', opacity: 0.7 }}>
            📅 {dateRange}
          </p>
        )}

        {/* Divider */}
        <div className="my-3.5" style={{ height: '1px', background: 'var(--border-subtle)' }} />

        {/* Members */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {shownMembers.map((m) =>
                m.user.avatarUrl ? (
                  <img key={m.id} src={m.user.avatarUrl} alt={m.user.name} title={m.user.name}
                       className="w-6 h-6 rounded-full ring-2"
                       style={{ '--tw-ring-color': 'var(--bg-surface)' } as React.CSSProperties} />
                ) : (
                  <div key={m.id} title={m.user.name}
                       className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ring-2"
                       style={{
                         background: 'var(--accent-forest)',
                         color: '#fff',
                         '--tw-ring-color': 'var(--bg-surface)',
                         fontSize: '0.6rem',
                       } as React.CSSProperties}>
                    {m.user.name[0]}
                  </div>
                )
              )}
              {overflow > 0 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center ring-2"
                     style={{
                       background: 'var(--bg-elevated)',
                       color: 'var(--text-muted)',
                       '--tw-ring-color': 'var(--bg-surface)',
                       fontSize: '0.6rem',
                     } as React.CSSProperties}>
                  +{overflow}
                </div>
              )}
            </div>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', fontSize: '0.72rem' }}>
              {acceptedMembers.length} member{acceptedMembers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* View arrow */}
          <span className="text-xs transition-transform duration-200 group-hover:translate-x-1"
                style={{ color: 'var(--accent-forest)', fontFamily: 'Sora, sans-serif' }}>
            View →
          </span>
        </div>
      </div>
    </div>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}
