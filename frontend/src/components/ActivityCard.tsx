import type { Activity } from '../types/itinerary'
import type { VoteCounts } from '../hooks/useVotes' // kept for prop type compatibility

interface Props {
  activity: Activity
  slot: 'morning' | 'afternoon' | 'evening'
  itineraryId?: string
  tripId?: string
  votes?: VoteCounts
  onVote?: (activityId: string, itineraryId: string, value: 'THUMBS_UP' | 'THUMBS_DOWN' | 'REMOVE') => void
  // votes/onVote props retained for future use but not rendered
}

const SLOT_LABELS = {
  morning:   { label: 'Morning',   color: 'var(--accent-sun)',   bg: 'var(--accent-sun-bg)'   },
  afternoon: { label: 'Afternoon', color: 'var(--accent-sky)',   bg: 'var(--accent-sky-bg)'   },
  evening:   { label: 'Evening',   color: 'var(--accent-bloom)', bg: 'var(--accent-bloom-bg)' },
}

export default function ActivityCard({ activity, slot }: Props) {
  const meta = SLOT_LABELS[slot]

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Top row: slot badge + duration + votes */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {activity.duration}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none mt-0.5">{activity.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
            {activity.title}
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {activity.description}
          </p>
        </div>
      </div>

      {/* Cost + tip */}
      <div className="flex flex-wrap items-start gap-2 mt-1">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)' }}>
          {activity.estimatedCost}
        </span>
        {activity.tips && (
          <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            💡 {activity.tips}
          </p>
        )}
      </div>
    </div>
  )
}

