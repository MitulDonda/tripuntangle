import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const DESTINATIONS = ['Kyoto', 'Santorini', 'Patagonia', 'Marrakech', 'Queenstown', 'Amalfi']

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Left panel: editorial hero ─────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12"
           style={{ background: 'linear-gradient(160deg, #0a1a10 0%, #0c1e18 40%, #091522 100%)' }}>

        {/* Mesh background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full"
               style={{ background: 'radial-gradient(ellipse 70% 60% at 30% 20%, rgba(74,155,111,0.18) 0%, transparent 65%)' }} />
          <div className="absolute bottom-0 right-0 w-3/4 h-3/4"
               style={{ background: 'radial-gradient(ellipse 60% 50% at 70% 80%, rgba(91,155,213,0.1) 0%, transparent 65%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96"
               style={{ background: 'radial-gradient(circle, rgba(201,165,90,0.06) 0%, transparent 70%)' }} />
        </div>

        {/* Rotating compass ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-spin-slow"
             style={{ width: '520px', height: '520px', border: '1px solid rgba(74,155,111,0.08)', borderRadius: '50%' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
             style={{ width: '380px', height: '380px', border: '1px dashed rgba(201,165,90,0.07)', borderRadius: '50%', animation: 'spinSlow 30s linear infinite reverse' }} />

        {/* Logo mark */}
        <div className="relative z-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                 style={{ background: 'linear-gradient(135deg, rgba(74,155,111,0.3), rgba(74,155,111,0.15))', border: '1px solid rgba(74,155,111,0.4)' }}>
              ✈️
            </div>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600, color: '#EBF0E8', letterSpacing: '-0.01em' }}>
              TripUntangle
            </span>
          </div>
        </div>

        {/* Hero headline */}
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-6 animate-fade-in-up delay-150"
             style={{ color: 'var(--accent-gold)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.18em' }}>
            AI-Powered Group Travel
          </p>
          <h1 className="animate-fade-in-up delay-200"
              style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(2.8rem, 4.5vw, 4rem)', fontWeight: 300, lineHeight: 1.12, color: '#EBF0E8', letterSpacing: '-0.02em' }}>
            Your next<br />
            <em style={{ fontStyle: 'italic', color: 'var(--accent-gold)', fontWeight: 400 }}>adventure</em>,<br />
            untangled.
          </h1>
          <p className="mt-5 text-base leading-relaxed animate-fade-in-up delay-300"
             style={{ color: 'rgba(235,240,232,0.5)', fontFamily: 'Sora, sans-serif', fontWeight: 300, maxWidth: '380px' }}>
            Plan group trips without the chaos — AI reconciles everyone's preferences into one perfect itinerary.
          </p>

          {/* Destination marquee */}
          <div className="flex flex-wrap gap-2 mt-8 animate-fade-in-up delay-400">
            {DESTINATIONS.map((d, i) => (
              <span key={d} className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      background: i % 2 === 0 ? 'rgba(74,155,111,0.12)' : 'rgba(201,165,90,0.1)',
                      border: `1px solid ${i % 2 === 0 ? 'rgba(74,155,111,0.25)' : 'rgba(201,165,90,0.2)'}`,
                      color: i % 2 === 0 ? 'rgba(74,155,111,0.9)' : 'rgba(201,165,90,0.85)',
                      fontFamily: 'Sora, sans-serif',
                    }}>
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 border-l-2 pl-4 animate-fade-in-up delay-500"
             style={{ borderColor: 'rgba(74,155,111,0.35)' }}>
          <p className="text-sm italic" style={{ color: 'rgba(235,240,232,0.4)', fontFamily: 'Fraunces, serif', fontWeight: 300 }}>
            "The world is a book, and those who do not travel read only one page."
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(235,240,232,0.25)', fontFamily: 'Sora, sans-serif' }}>
            — Saint Augustine
          </p>
        </div>
      </div>

      {/* ── Right panel: login form ─────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

        {/* Subtle background orbs (mobile visible) */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full pointer-events-none animate-glow-pulse"
             style={{ background: 'radial-gradient(circle, var(--accent-forest-bg) 0%, transparent 70%)', opacity: 0.6 }} />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full pointer-events-none animate-glow-pulse delay-300"
             style={{ background: 'radial-gradient(circle, var(--accent-gold-bg) 0%, transparent 70%)', opacity: 0.5 }} />

        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10 animate-fade-in-up">
          <span className="text-2xl">✈️</span>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            TripUntangle
          </span>
        </div>

        {/* Login card */}
        <div className="w-full max-w-[400px] relative z-10">
          <div className="animate-fade-in-scale">
            <h2 className="text-3xl mb-1"
                style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Welcome back
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
              Sign in to plan your next great escape
            </p>

            {/* Google button */}
            <a
              href={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/auth/google`}
              className="flex items-center justify-center gap-3 w-full py-3.5 px-5 rounded-xl font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--accent-forest) 0%, #357a52 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(74,155,111,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                fontFamily: 'Sora, sans-serif',
                fontSize: '0.9rem',
              }}
            >
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
              <GoogleIcon />
              Continue with Google
            </a>

          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-10 animate-fade-in-up delay-300">
            {[
              { icon: '🤝', label: 'Group planning' },
              { icon: '✨', label: 'AI itineraries' },
              { icon: '📅', label: 'Smart scheduling' },
              { icon: '💰', label: 'Budget aware' },
            ].map((f) => (
              <span key={f.label} className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      fontFamily: 'Sora, sans-serif',
                    }}>
                <span>{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
