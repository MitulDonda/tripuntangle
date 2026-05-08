import type { ItineraryContent, EssentialTips } from '../types/itinerary'
import type { VotesMap } from '../hooks/useVotes'
import ActivityCard from './ActivityCard'

interface Props {
  content: ItineraryContent
  itineraryId?: string
  tripId?: string
  votesMap?: VotesMap
  onVote?: (activityId: string, itineraryId: string, value: 'THUMBS_UP' | 'THUMBS_DOWN' | 'REMOVE') => void
}

const DAY_GRADIENTS = [
  'linear-gradient(135deg, var(--accent-forest-bg), var(--accent-sky-bg))',
  'linear-gradient(135deg, var(--accent-sky-bg), var(--accent-bloom-bg))',
  'linear-gradient(135deg, var(--accent-sun-bg), var(--accent-forest-bg))',
  'linear-gradient(135deg, var(--accent-bloom-bg), var(--accent-sky-bg))',
  'linear-gradient(135deg, var(--accent-forest-bg), var(--accent-sun-bg))',
  'linear-gradient(135deg, var(--accent-sky-bg), var(--accent-forest-bg))',
  'linear-gradient(135deg, var(--accent-sun-bg), var(--accent-bloom-bg))',
]

function EssentialTipsCard({ tips }: { tips: EssentialTips }) {
  const items = [
    tips.visa        && { icon: '🛂', label: 'Visa',      text: tips.visa },
    tips.bestTime    && { icon: '🌤️', label: 'Best Time', text: tips.bestTime },
    tips.transport   && { icon: '🚌', label: 'Transport',  text: tips.transport },
    tips.safety      && { icon: '🛡️', label: 'Safety',    text: tips.safety },
    tips.currency    && { icon: '💱', label: 'Currency',   text: tips.currency },
  ].filter(Boolean) as { icon: string; label: string; text: string }[]

  return (
    <div className="rounded-xl p-5"
         style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span>📌</span> Essential Tips
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
            <span className="text-lg shrink-0">{item.icon}</span>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.text}</p>
            </div>
          </div>
        ))}
        {tips.mustPack && tips.mustPack.length > 0 && (
          <div className="flex gap-3 p-3 rounded-lg sm:col-span-2" style={{ background: 'var(--bg-elevated)' }}>
            <span className="text-lg shrink-0">🎒</span>
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Must Pack</p>
              <div className="flex flex-wrap gap-1.5">
                {tips.mustPack.map((item) => (
                  <span key={item} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)' }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ItineraryView({ content, itineraryId, tripId, votesMap, onVote }: Props) {
  if (!content || !Array.isArray(content.days)) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Itinerary data is still loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Conflict Resolution Summary */}
      <div className="rounded-xl p-5"
           style={{ background: 'linear-gradient(135deg, var(--accent-forest-bg), var(--bg-elevated))', border: '1px solid var(--accent-forest)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤝</span>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--accent-forest)' }}>
            How we balanced everyone's preferences
          </h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {content.conflictSummary}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>📅 Recommended Dates</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{content.recommendedDates}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>💰 Budget</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{content.budgetNote}</p>
          </div>
        </div>
      </div>

      {/* Essential Tips */}
      {content.essentialTips && <EssentialTipsCard tips={content.essentialTips} />}

      {/* Day Cards */}
      {content.days.map((day, i) => (
        <div key={day.dayNumber} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Day Header */}
          <div className="px-5 py-4" style={{ background: DAY_GRADIENTS[i % DAY_GRADIENTS.length] }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Day {day.dayNumber}
                </span>
                <h3 className="text-lg font-semibold mt-0.5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', letterSpacing: '-0.01em' }}>
                  {day.theme}
                </h3>
              </div>
              <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-full"
                    style={{ background: 'var(--day-emoji-bg)' }}>
                {['🌅', '🌤️', '🌙', '✨', '🗺️', '🌿', '🎉'][i % 7]}
              </span>
            </div>
          </div>

          {/* Activities */}
          <div className="p-4 grid gap-3" style={{ background: 'var(--bg-surface)' }}>
            {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
              const raw = day.slots?.[slot]
              if (!raw) return null
              // Guarantee a stable activity ID even when AI omits it
              const activity = { ...raw, id: raw.id || `d${day.dayNumber}_${slot}` }
              return (
                <ActivityCard
                  key={slot}
                  activity={activity}
                  slot={slot}
                  itineraryId={itineraryId}
                  tripId={tripId}
                  votes={votesMap?.votes?.[activity.id]}
                  onVote={onVote}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
