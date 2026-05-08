import { useState } from 'react'
import { useSubmitPreference, type PreferenceInput, type Vibe, type Dietary, type BudgetTier } from '../hooks/usePreferences'
import { cn } from '../lib/utils'

const TOTAL_STEPS = 5

const VIBES: { value: Vibe; label: string; emoji: string }[] = [
  { value: 'NIGHTLIFE',     label: 'Nightlife',     emoji: '🌙' },
  { value: 'NATURE',        label: 'Nature',         emoji: '🌿' },
  { value: 'ADVENTURE',     label: 'Adventure',      emoji: '🧗' },
  { value: 'RELAXATION',    label: 'Relaxation',     emoji: '🧘' },
  { value: 'CULTURE',       label: 'Culture',        emoji: '🏛️' },
  { value: 'FOOD_AND_DRINK',label: 'Food & Drink',   emoji: '🍜' },
  { value: 'WELLNESS',      label: 'Wellness',       emoji: '💆' },
]

const DIETARY_OPTIONS: { value: Dietary; label: string }[] = [
  { value: 'VEGETARIAN',    label: '🥗 Vegetarian' },
  { value: 'VEGAN',         label: '🌱 Vegan' },
  { value: 'NON_VEGETARIAN',label: '🍗 Non-Vegetarian' },
  { value: 'GLUTEN_FREE',   label: '🌾 Gluten-Free' },
  { value: 'NUT_ALLERGY',   label: '🥜 Nut Allergy' },
  { value: 'OTHER',         label: '⚠️ Other' },
]

const BUDGETS: { value: BudgetTier; label: string; emoji: string; desc: string }[] = [
  { value: 'BACKPACKER',  label: 'Backpacker',  emoji: '🎒', desc: 'Hostels, street food, budget transport' },
  { value: 'FLASHPACKER', label: 'Flashpacker', emoji: '🧳', desc: 'Mid-range hotels, local restaurants' },
  { value: 'LUXURY',      label: 'Luxury',      emoji: '✨', desc: 'Boutique hotels, fine dining, comfort' },
]

function calcEndDate(startIso: string, days: number): string {
  const d = new Date(startIso)
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().split('T')[0]
}

/** Normalise any ISO date string to YYYY-MM-DD for <input type="date"> */
function toDateInput(iso: string | undefined): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

function calcDuration(startIso: string, endIso: string): number {
  const start = new Date(startIso)
  const end   = new Date(endIso)
  const days  = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  return Math.min(14, Math.max(3, days))
}

interface Props {
  tripId: string
  travelStart?: string
  travelEnd?: string
  onDone: () => void
}

export default function PreferenceSurvey({ tripId, travelStart, travelEnd, onDone }: Props) {
  const submit = useSubmitPreference(tripId)
  const [step, setStep] = useState(1)

  const startDate = toDateInput(travelStart)
  const endDate   = toDateInput(travelEnd)

  const initDuration = startDate && endDate
    ? calcDuration(startDate, endDate)
    : 7
  const initEnd = startDate
    ? calcEndDate(startDate, initDuration)
    : ''

  const [form, setForm] = useState<Partial<PreferenceInput>>({
    vibes: [],
    dietary: [],
    durationDays: initDuration,
    availStart: startDate,
    availEnd: initEnd,
  })

  function next() { setStep((s) => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setStep((s) => Math.max(s - 1, 1)) }

  function toggleVibe(v: Vibe) {
    const curr = form.vibes ?? []
    if (curr.includes(v)) {
      setForm((f) => ({ ...f, vibes: curr.filter((x) => x !== v) }))
    } else if (curr.length < 3) {
      setForm((f) => ({ ...f, vibes: [...curr, v] }))
    }
  }

  function toggleDietary(d: Dietary) {
    const curr = form.dietary ?? []
    setForm((f) => ({
      ...f,
      dietary: curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d],
    }))
  }

  async function handleSubmit() {
    await submit.mutateAsync(form as PreferenceInput)
    onDone()
  }

  const canProceed = (() => {
    if (step === 1) return !!(form.availStart && form.durationDays)
    if (step === 2) return !!form.budgetTier
    if (step === 3) return (form.vibes?.length ?? 0) >= 1
    if (step === 4) return true  // dietary optional
    return true
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: 'var(--accent-forest)' }}
          />
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full transition-all"
                       style={{ background: i < step ? 'var(--accent-forest)' : 'var(--border)' }} />
                ))}
              </div>
              <button
                onClick={onDone}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-70 text-base leading-none"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Step 1: Availability ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                📅 When can you travel?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                Pick your start date and ideal trip length.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
                  <input
                    type="date"
                    value={form.availStart ?? ''}
                    onChange={(e) => {
                      const start = e.target.value
                      const days = form.durationDays ?? 7
                      const end = start ? calcEndDate(start, days) : ''
                      setForm((f) => ({ ...f, availStart: start, availEnd: end }))
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', colorScheme: 'inherit' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    To
                    <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)', fontSize: '0.65rem' }}>
                      auto
                    </span>
                  </label>
                  <input
                    type="date"
                    value={form.availEnd ?? ''}
                    readOnly
                    tabIndex={-1}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: form.availEnd ? 'var(--accent-forest)' : 'var(--text-muted)',
                      colorScheme: 'inherit',
                      cursor: 'default',
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Ideal trip length: <strong style={{ color: 'var(--accent-forest)' }}>{form.durationDays} days</strong>
                </label>
                <input
                  type="range" min={3} max={14}
                  value={form.durationDays ?? 7}
                  onChange={(e) => {
                    const days = Number(e.target.value)
                    const end = form.availStart ? calcEndDate(form.availStart, days) : ''
                    setForm((f) => ({ ...f, durationDays: days, availEnd: end || f.availEnd }))
                  }}
                  className="w-full accent-green-600"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>3 days</span><span>14 days</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Budget ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                💰 What's your budget vibe?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                The AI will reconcile everyone's budgets fairly.
              </p>
              <div className="flex flex-col gap-3">
                {BUDGETS.map((b) => (
                  <button key={b.value} onClick={() => setForm((f) => ({ ...f, budgetTier: b.value }))}
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: form.budgetTier === b.value ? 'var(--accent-forest-bg)' : 'var(--bg-elevated)',
                      border: `1px solid ${form.budgetTier === b.value ? 'var(--accent-forest)' : 'var(--border)'}`,
                    }}>
                    <span className="text-2xl">{b.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{b.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.desc}</p>
                    </div>
                    {form.budgetTier === b.value && (
                      <span className="ml-auto text-sm" style={{ color: 'var(--accent-forest)' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Vibe Check ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                🎯 What's your vibe?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                Pick up to 3. The AI weights majority vibes for full-day blocks.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VIBES.map((v) => {
                  const selected = form.vibes?.includes(v.value)
                  const maxed = (form.vibes?.length ?? 0) >= 3 && !selected
                  return (
                    <button key={v.value} onClick={() => toggleVibe(v.value)} disabled={maxed}
                      className={cn('flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left', maxed && 'opacity-40')}
                      style={{
                        background: selected ? 'var(--accent-forest-bg)' : 'var(--bg-elevated)',
                        border: `1px solid ${selected ? 'var(--accent-forest)' : 'var(--border)'}`,
                        color: selected ? 'var(--accent-forest)' : 'var(--text-primary)',
                      }}>
                      <span className="text-lg">{v.emoji}</span>
                      {v.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs mt-3 text-right" style={{ color: 'var(--text-muted)' }}>
                {form.vibes?.length ?? 0}/3 selected
              </p>
            </div>
          )}

          {/* ── Step 4: Dietary ── */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                🍽️ Any dietary needs?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                Allergies take absolute priority in restaurant suggestions.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_OPTIONS.map((d) => {
                  const selected = form.dietary?.includes(d.value)
                  return (
                    <button key={d.value} onClick={() => toggleDietary(d.value)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left"
                      style={{
                        background: selected ? 'var(--accent-forest-bg)' : 'var(--bg-elevated)',
                        border: `1px solid ${selected ? 'var(--accent-forest)' : 'var(--border)'}`,
                        color: selected ? 'var(--accent-forest)' : 'var(--text-primary)',
                      }}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 5: Wildcard ── */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                ✨ Your must-do moment
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                One thing you absolutely want on this trip. The AI will try to include it.
              </p>
              <textarea rows={4} maxLength={300}
                placeholder="e.g. Watch the sunrise from a rice terrace, eat the best ramen of my life..."
                value={form.wildcardText ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, wildcardText: e.target.value }))}
                className="w-full px-3 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
                {(form.wildcardText ?? '').length}/300
              </p>

              {submit.isError && (
                <p className="text-sm mt-2" style={{ color: 'var(--accent-bloom)' }}>
                  Failed to save preferences. Please try again.
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={back}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                ← Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button onClick={next} disabled={!canProceed}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submit.isPending}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                {submit.isPending ? 'Saving…' : '🎉 Submit Preferences'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
