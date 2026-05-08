import { useState, useRef, useEffect } from 'react'
import { useCreateTrip } from '../hooks/useTrips'
import { useNavigate } from 'react-router-dom'

const DESTINATIONS = [
  'Bali, Indonesia', 'Bangkok, Thailand', 'Barcelona, Spain', 'Berlin, Germany',
  'Cape Town, South Africa', 'Chiang Mai, Thailand', 'Copenhagen, Denmark',
  'Dubai, UAE', 'Edinburgh, Scotland', 'Florence, Italy', 'Goa, India',
  'Hanoi, Vietnam', 'Ho Chi Minh City, Vietnam', 'Hong Kong', 'Istanbul, Turkey',
  'Jaipur, India', 'Johannesburg, South Africa', 'Kathmandu, Nepal',
  'Kerala, India', 'Kolkata, India', 'Krabi, Thailand', 'Kuala Lumpur, Malaysia',
  'Kyoto, Japan', 'Lisbon, Portugal', 'London, UK', 'Los Angeles, USA',
  'Maldives', 'Marrakech, Morocco', 'Melbourne, Australia', 'Mexico City, Mexico',
  'Milan, Italy', 'Mumbai, India', 'Munich, Germany', 'Muscat, Oman',
  'New Delhi, India', 'New York, USA', 'New Zealand', 'Nice, France',
  'Osaka, Japan', 'Oslo, Norway', 'Paris, France', 'Patagonia, Argentina',
  'Phuket, Thailand', 'Prague, Czech Republic', 'Queenstown, New Zealand',
  'Reykjavik, Iceland', 'Rio de Janeiro, Brazil', 'Rome, Italy',
  'Santorini, Greece', 'Seoul, South Korea', 'Singapore',
  'Sydney, Australia', 'Taipei, Taiwan', 'Tokyo, Japan', 'Toronto, Canada',
  'Venice, Italy', 'Vienna, Austria', 'Zurich, Switzerland',
  'Amalfi Coast, Italy', 'Angkor Wat, Cambodia', 'Bruges, Belgium',
  'Budapest, Hungary', 'Cairo, Egypt', 'Cancun, Mexico', 'Colombo, Sri Lanka',
  'Dubrovnik, Croatia', 'Havana, Cuba', 'Lombok, Indonesia', 'Luxor, Egypt',
  'Macao', 'Nairobi, Kenya', 'Petra, Jordan', 'Seville, Spain',
  'Shimla, India', 'Swiss Alps, Switzerland', 'Tuscany, Italy',
  'Vancouver, Canada', 'Yangon, Myanmar',
]

function calcEndDate(startIso: string, days: number): string {
  const d = new Date(startIso)
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().split('T')[0]
}

interface Props {
  onClose: () => void
}

export default function CreateTripModal({ onClose }: Props) {
  const navigate = useNavigate()
  const createTrip = useCreateTrip()

  const [durationDays, setDurationDays] = useState(7)
  const [form, setForm] = useState({ name: '', destination: '', travelStart: '', travelEnd: '' })
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const destRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
  }

  function handleDestinationChange(value: string) {
    set('destination', value)
    setHighlightIndex(-1)
    if (value.trim().length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const q = value.toLowerCase()
    const matches = DESTINATIONS.filter((d) => d.toLowerCase().includes(q)).slice(0, 7)
    setSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }

  function selectSuggestion(dest: string) {
    set('destination', dest)
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (destRef.current && !destRef.current.contains(e.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.destination.trim()) {
      setError('Trip name and destination are required.')
      return
    }
    try {
      const trip = await createTrip.mutateAsync({
        name: form.name.trim(),
        destination: form.destination.trim(),
        travelStart: form.travelStart || undefined,
        travelEnd: form.travelEnd || undefined,
      })
      onClose()
      navigate(`/trips/${trip.id}`)
    } catch {
      setError('Failed to create trip. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in-scale"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>
            ✈️ New Trip
          </h2>
          <button onClick={onClose} className="text-xl leading-none transition hover:opacity-60"
                  style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Trip name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                   style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.08em' }}>
              Trip Name <span style={{ color: 'var(--accent-bloom)' }}>*</span>
            </label>
            <input
              type="text"
              maxLength={60}
              placeholder="e.g. Bali Squad 2026"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'Sora, sans-serif',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-forest)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
              {form.name.length}/60
            </p>
          </div>

          {/* Destination with suggestions */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                   style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.08em' }}>
              Destination <span style={{ color: 'var(--accent-bloom)' }}>*</span>
            </label>
            <div className="relative">
              <input
                ref={destRef}
                type="text"
                placeholder="e.g. Bali, Indonesia"
                value={form.destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true)
                }}
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition"
                style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${showSuggestions ? 'var(--accent-forest)' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                  fontFamily: 'Sora, sans-serif',
                  borderRadius: showSuggestions ? '0.75rem 0.75rem 0 0' : '0.75rem',
                }}
              />

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 z-50 overflow-hidden"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--accent-forest)',
                    borderTop: 'none',
                    borderRadius: '0 0 0.75rem 0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
                >
                  {suggestions.map((dest, i) => {
                    const q = form.destination.toLowerCase()
                    const idx = dest.toLowerCase().indexOf(q)
                    const before = dest.slice(0, idx)
                    const match  = dest.slice(idx, idx + q.length)
                    const after  = dest.slice(idx + q.length)
                    return (
                      <button
                        key={dest}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(dest) }}
                        onMouseEnter={() => setHighlightIndex(i)}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
                        style={{
                          background: highlightIndex === i ? 'var(--accent-forest-bg)' : 'transparent',
                          color: 'var(--text-primary)',
                          fontFamily: 'Sora, sans-serif',
                          borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                        }}
                      >
                        <span style={{ color: 'var(--accent-forest)', fontSize: '0.75rem' }}>◆</span>
                        <span>
                          {before}
                          <strong style={{ color: 'var(--accent-forest)' }}>{match}</strong>
                          {after}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Travel window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                     style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.08em' }}>
                Start Date
              </label>
              <input
                type="date"
                value={form.travelStart}
                onChange={(e) => {
                  const start = e.target.value
                  const end = start ? calcEndDate(start, durationDays) : ''
                  setForm((f) => ({ ...f, travelStart: start, travelEnd: end }))
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  colorScheme: 'inherit',
                  fontFamily: 'Sora, sans-serif',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-forest)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide flex items-center gap-1.5"
                     style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.08em' }}>
                End Date
                <span className="text-xs px-1.5 py-0.5 rounded normal-case tracking-normal"
                      style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)', fontSize: '0.65rem' }}>
                  auto
                </span>
              </label>
              <input
                type="date"
                value={form.travelEnd}
                readOnly
                tabIndex={-1}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: form.travelEnd ? 'var(--accent-forest)' : 'var(--text-muted)',
                  colorScheme: 'inherit',
                  fontFamily: 'Sora, sans-serif',
                  cursor: 'default',
                  opacity: 0.85,
                }}
              />
            </div>
          </div>

          {/* Duration slider */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                   style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', letterSpacing: '0.08em' }}>
              Trip Length:{' '}
              <strong style={{ color: 'var(--accent-forest)', textTransform: 'none', letterSpacing: 'normal' }}>
                {durationDays} days
              </strong>
            </label>
            <input
              type="range" min={3} max={30}
              value={durationDays}
              onChange={(e) => {
                const days = Number(e.target.value)
                setDurationDays(days)
                if (form.travelStart) {
                  setForm((f) => ({ ...f, travelEnd: calcEndDate(f.travelStart, days) }))
                }
              }}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs mt-1"
                 style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
              <span>3 days</span><span>30 days</span>
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--accent-bloom)', fontFamily: 'Sora, sans-serif' }}>{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'Sora, sans-serif' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTrip.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--accent-forest), #357a52)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(74,155,111,0.28)',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              {createTrip.isPending ? 'Creating…' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
