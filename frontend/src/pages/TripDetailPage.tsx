import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip, useDeleteTrip } from '../hooks/useTrips'
import { useAuth } from '../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import InviteModal from '../components/InviteModal'
import PreferenceSurvey from '../components/PreferenceSurvey'
import ItineraryView from '../components/ItineraryView'
import ChatPanel from '../components/ChatPanel'
import GroupChatPanel from '../components/GroupChatPanel'
import { useMyPreference } from '../hooks/usePreferences'
import { useGenerateItinerary, useResetTripStatus, useRefineItinerary } from '../hooks/useItinerary'
import { useVotes, useCastVote } from '../hooks/useVotes'
import { io as socketIo } from 'socket.io-client'
import { useTheme } from '../hooks/useTheme'
import type { ItineraryContent } from '../types/itinerary'
import type { ChatMessage } from '../hooks/useChat'
import type { GroupMessage } from '../hooks/useGroupChat'
import type { VotesMap } from '../hooks/useVotes'

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: trip, isLoading } = useTrip(id!)
  const { data: myPreference } = useMyPreference(id!)
  // Itinerary is already embedded in the trip response — no extra API call needed
  const itinerary = trip?.itineraries?.[0] ?? null
  const { data: votesData } = useVotes(id!, !!itinerary)
  const generate = useGenerateItinerary(id!)
  const resetStatus = useResetTripStatus(id!)
  const refine = useRefineItinerary(id!)
  const deleteTrip = useDeleteTrip()
  const castVote = useCastVote(id!)

  const { theme, toggle: toggleTheme } = useTheme()
  const [showInvite, setShowInvite] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)
  const [showChat, setShowChat] = useState(false)
const [chatTab, setChatTab] = useState<'ai' | 'group'>('group')
  const [refineInput, setRefineInput] = useState('')
  const [refineError, setRefineError] = useState<string | null>(null)
  const [generatingLive, setGeneratingLive] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([])
  const [liveGroupMessages, setLiveGroupMessages] = useState<GroupMessage[]>([])
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [liveVotes, setLiveVotes] = useState<VotesMap | null>(null)

  // Reset live state when trip changes
  useEffect(() => {
    setLiveMessages([])
    setLiveGroupMessages([])
    setIsAiThinking(false)
    setGeneratingLive(false)
    setGenError(null)
  }, [id])

  // Socket connection
  useEffect(() => {
    if (!id) return
    const socket = socketIo(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', {
      withCredentials: true,
    })
    socket.on('connect', () => socket.emit('join-trip', id))

    // Generation events
    socket.on('generation:started', () => {
      setGeneratingLive(true)
      setGenError(null)
      queryClient.invalidateQueries({ queryKey: ['trips', id] })
    })
    socket.on('generation:complete', () => {
      setGeneratingLive(false)
      queryClient.invalidateQueries({ queryKey: ['trips', id] })
    })
    socket.on('generation:error', ({ error }: { error: string }) => {
      setGeneratingLive(false)
      setGenError(error)
      queryClient.invalidateQueries({ queryKey: ['trips', id] })
    })

    // Itinerary refined by a member — trip cache holds itinerary, so invalidate trips
    socket.on('itinerary:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['trips', id] })
    })

    // Chat events — guard by tripId so stale sockets never bleed across trips
    socket.on('chat:message', (msg: ChatMessage) => {
      if (msg.tripId !== id) return
      setIsAiThinking(false)
      setLiveMessages((prev) => [...prev, msg])
    })
    socket.on('chat:thinking', () => setIsAiThinking(true))
    socket.on('chat:error', () => setIsAiThinking(false))

    // Group chat events — same guard
    socket.on('group:message', (msg: GroupMessage) => {
      if (msg.tripId !== id) return
      setLiveGroupMessages((prev) => [...prev, msg])
    })

    // Vote events
    socket.on('vote:update', ({ activityId, itineraryId, counts }: {
      activityId: string; itineraryId: string; counts: { up: number; down: number }
    }) => {
      setLiveVotes((prev) => {
        const base = prev ?? votesData ?? { itineraryId, votes: {} }
        return {
          ...base,
          votes: {
            ...base.votes,
            [activityId]: {
              ...base.votes?.[activityId],
              up: counts.up,
              down: counts.down,
            },
          },
        }
      })
      queryClient.invalidateQueries({ queryKey: ['votes', id] })
    })

    return () => { socket.disconnect() }
  }, [id, queryClient, votesData])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--accent-forest)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Trip not found.</p>
        <button onClick={() => navigate('/dashboard')} className="underline text-sm"
                style={{ color: 'var(--accent-sky)' }}>← Back to dashboard</button>
      </div>
    )
  }

  const isOwner = trip.members.find((m) => m.user.id === user?.id)?.role === 'OWNER'
  const accepted = trip.members.filter((m) => m.inviteStatus === 'ACCEPTED')
  const pending  = trip.members.filter((m) => m.inviteStatus === 'PENDING')
  const isGenerating = trip.status === 'GENERATING' || generatingLive
  const hasItinerary  = !!itinerary && trip.status !== 'PLANNING' && !isGenerating

  const mergedVotes: VotesMap | undefined = liveVotes ?? votesData

  function handleVote(activityId: string, itId: string, value: 'THUMBS_UP' | 'THUMBS_DOWN' | 'REMOVE') {
    castVote.mutate({ activityId, itineraryId: itId, value })
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Nav */}
      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1 text-sm transition hover:opacity-70"
                  style={{ color: 'var(--accent-sky)' }}>
            ← Dashboard
          </button>
          <span className="font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>
            ✈️ TripUntangle
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-base transition hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {hasItinerary && (
              <button
                onClick={() => setShowChat((v) => !v)}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition hover:opacity-90 lg:hidden"
                style={{ background: showChat ? 'var(--accent-sky)' : 'var(--bg-elevated)', color: showChat ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                💬 {showChat ? 'Hide' : 'Chat'}
              </button>
            )}
            {isOwner && (
              <>
                <button onClick={() => setShowInvite(true)}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium transition hover:opacity-90"
                        style={{ background: 'var(--accent-forest)', color: '#fff', fontFamily: 'Sora, sans-serif' }}>
                  + Invite
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium transition hover:opacity-90"
                        style={{ background: 'var(--accent-bloom-bg)', color: 'var(--accent-bloom)', border: '1px solid var(--accent-bloom)', fontFamily: 'Sora, sans-serif' }}>
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Trip header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold mb-1"
                  style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                {trip.name}
              </h1>
              <p className="text-base" style={{ color: 'var(--text-muted)' }}>📍 {trip.destination}</p>
              {trip.travelStart && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  📅 {fmt(trip.travelStart)}{trip.travelEnd ? ` → ${fmt(trip.travelEnd)}` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs px-2 py-1 rounded-full shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Code: <strong style={{ color: 'var(--accent-sun)' }}>{trip.shortCode}</strong>
              </span>
              <StatusPill status={trip.status} />
            </div>
          </div>
        </div>

        {/* Members */}
        <section className="rounded-xl p-5 mb-6"
                 style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              👥 Members ({accepted.length})
            </h2>
            {isOwner && (
              <button onClick={() => setShowInvite(true)} className="text-sm transition hover:opacity-70"
                      style={{ color: 'var(--accent-forest)' }}>
                + Invite more
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {accepted.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                   style={{ background: 'var(--bg-elevated)' }}>
                {m.user.avatarUrl ? (
                  <img src={m.user.avatarUrl} alt={m.user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                       style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                    {m.user.name[0]}
                  </div>
                )}
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{m.user.name}</span>
                {m.role === 'OWNER' && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)' }}>Owner</span>
                )}
              </div>
            ))}
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg opacity-50"
                   style={{ background: 'var(--bg-elevated)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                     style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>?</div>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {m.inviteEmail ?? 'Invited'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun)' }}>Pending</span>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences — PLANNING only */}
        {trip.status === 'PLANNING' && (
          <section className="rounded-xl p-5 mb-6"
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>📋 Your Preferences</h2>
            {myPreference ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                       style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)' }}>✓</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Preferences submitted</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {myPreference.budgetTier} · {myPreference.vibes?.join(', ')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowSurvey(true)} className="text-sm transition hover:opacity-70"
                        style={{ color: 'var(--accent-sky)' }}>Edit</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tell the AI what you want from this trip.</p>
                <button onClick={() => setShowSurvey(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                        style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                  Fill Preferences
                </button>
              </div>
            )}

            {isOwner && myPreference && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                {genError && (
                  <p className="text-sm mb-3" style={{ color: 'var(--accent-bloom)' }}>⚠️ {genError}</p>
                )}
                <button onClick={() => { setGenError(null); generate.mutate() }} disabled={generate.isPending}
                        className="w-full py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                  {generate.isPending ? '✨ Queuing…' : '✨ Generate Itinerary with AI'}
                </button>
                <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                  Takes ~20–30 seconds · All members will see the result
                </p>
              </div>
            )}

            {!isOwner && myPreference && (
              <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--accent-sun)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Preferences saved — waiting for the trip owner to generate the itinerary.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Group Chat — always visible during PLANNING */}
        {trip.status === 'PLANNING' && (
          <section className="rounded-xl overflow-hidden mb-6"
                   style={{ border: '1px solid var(--border)' }}>
            <GroupChatPanel tripId={id!} liveMessages={liveGroupMessages} />
          </section>
        )}

        {/* Generating skeleton */}
        {isGenerating && (
          <section className="rounded-xl p-5 mb-6"
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent-forest)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                     style={{ borderColor: 'var(--accent-forest)', borderTopColor: 'transparent' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--accent-forest)' }}>
                  ✨ AI is crafting your group itinerary…
                </p>
              </div>
              {isOwner && (
                <button onClick={() => resetStatus.mutate()} className="text-xs underline"
                        style={{ color: 'var(--text-muted)' }}>Stuck? Reset</button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="rounded-xl h-28 skeleton" />)}
            </div>
            <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
              Balancing everyone's preferences · Usually done in ~20 seconds
            </p>
          </section>
        )}

        {/* Itinerary + Chat split panel */}
        {hasItinerary && (
          <div>
            {/* Refine input */}
            <div className="mb-5 rounded-xl p-4"
                 style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                ✨ Refine itinerary with AI
              </p>
              <div className="flex gap-2">
                <input
                  value={refineInput}
                  onChange={(e) => { setRefineInput(e.target.value); setRefineError(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && refineInput.trim() && !refine.isPending) {
                      refine.mutate(refineInput.trim(), {
                        onSuccess: () => setRefineInput(''),
                        onError: (err: any) => setRefineError(err?.response?.data?.error ?? 'Failed to refine. Try again.'),
                      })
                    }
                  }}
                  placeholder="e.g. Replace Day 2 evening with a rooftop dinner, add more adventure activities…"
                  disabled={refine.isPending}
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => {
                    if (!refineInput.trim() || refine.isPending) return
                    refine.mutate(refineInput.trim(), {
                      onSuccess: () => setRefineInput(''),
                      onError: (err: any) => setRefineError(err?.response?.data?.error ?? 'Failed to refine. Try again.'),
                    })
                  }}
                  disabled={!refineInput.trim() || refine.isPending}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-40 shrink-0"
                  style={{ background: 'var(--accent-forest)', color: '#fff' }}
                >
                  {refine.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Updating…
                    </span>
                  ) : '✨ Update'}
                </button>
              </div>
              {refineError && (
                <p className="text-xs mt-2" style={{ color: 'var(--accent-bloom)' }}>⚠️ {refineError}</p>
              )}
              {refine.isSuccess && !refineError && (
                <p className="text-xs mt-2" style={{ color: 'var(--accent-forest)' }}>✓ Itinerary updated!</p>
              )}
            </div>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', letterSpacing: '-0.01em' }}>
                🗓️ Your Itinerary
              </h2>
              {/* Export bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/trips/${id}/export/pdf`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition hover:opacity-90"
                  style={{ background: 'var(--accent-bloom)', color: '#fff' }}
                >
                  📄 Download Itinerary
                </a>
              </div>
            </div>

            {/* Mobile chat toggle */}
            {showChat && (
              <div className="mb-6 lg:hidden">
                <div className="flex gap-1 rounded-xl p-1 mb-3"
                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {(['group', 'ai'] as const).map((tab) => (
                    <button key={tab} onClick={() => setChatTab(tab)}
                            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                            style={{
                              background: chatTab === tab ? 'var(--bg-surface)' : 'transparent',
                              color: chatTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                              boxShadow: chatTab === tab ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                              fontFamily: 'Sora, sans-serif',
                              fontSize: '0.8rem',
                            }}>
                      {tab === 'group' ? '👥 Group' : '✨ AI Assistant'}
                    </button>
                  ))}
                </div>
                {chatTab === 'group'
                  ? <GroupChatPanel tripId={id!} liveMessages={liveGroupMessages} />
                  : <ChatPanel tripId={id!} liveMessages={liveMessages} isThinking={isAiThinking} />}
              </div>
            )}

            {/* Desktop split */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <ItineraryView
                  content={itinerary!.content as unknown as ItineraryContent}
                  itineraryId={itinerary!.id}
                  tripId={id}
                  votesMap={mergedVotes}
                  onVote={handleVote}
                />
              </div>
              <div className="hidden lg:flex lg:col-span-2 lg:flex-col lg:sticky lg:top-6 lg:self-start gap-0">
                {/* Tab switcher */}
                <div className="flex gap-1 rounded-t-2xl p-1.5 shrink-0"
                     style={{
                       background: 'var(--bg-surface)',
                       border: '1px solid var(--border)',
                       borderBottom: 'none',
                     }}>
                  {(['group', 'ai'] as const).map((tab) => (
                    <button key={tab} onClick={() => setChatTab(tab)}
                            className="flex-1 py-2 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-1.5"
                            style={{
                              background: chatTab === tab ? 'var(--bg-elevated)' : 'transparent',
                              color: chatTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                              boxShadow: chatTab === tab ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                              fontFamily: 'Sora, sans-serif',
                              fontSize: '0.8rem',
                              letterSpacing: '0.01em',
                            }}>
                      <span style={{ fontSize: '0.9rem' }}>{tab === 'group' ? '👥' : '✨'}</span>
                      {tab === 'group' ? 'Group Chat' : 'AI Assistant'}
                    </button>
                  ))}
                </div>
                <div style={{
                  borderRadius: '0 0 16px 16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  borderTop: 'none',
                }}>
                  {chatTab === 'group'
                    ? <GroupChatPanel tripId={id!} liveMessages={liveGroupMessages} />
                    : <ChatPanel tripId={id!} liveMessages={liveMessages} isThinking={isAiThinking} />}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showSurvey && (
        <PreferenceSurvey
          tripId={trip.id}
          travelStart={trip.travelStart ?? undefined}
          travelEnd={trip.travelEnd ?? undefined}
          onDone={() => setShowSurvey(false)}
        />
      )}
      {showInvite && (
        <InviteModal tripId={trip.id} inviteCode={trip.inviteCode} shortCode={trip.shortCode}
                     onClose={() => setShowInvite(false)} />
      )}
{showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-in-scale"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent-bloom)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                 style={{ background: 'var(--accent-bloom-bg)' }}>
              🗑️
            </div>
            <h2 className="text-xl font-semibold mb-2"
                style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>
              Delete "{trip.name}"?
            </h2>
            <p className="text-sm mb-6 leading-relaxed"
               style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
              This will permanently delete the trip, all itineraries, preferences, and messages. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'Sora, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteTrip.mutateAsync(trip.id)
                  navigate('/dashboard')
                }}
                disabled={deleteTrip.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent-bloom)', color: '#fff', fontFamily: 'Sora, sans-serif' }}
              >
                {deleteTrip.isPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function StatusPill({ status }: { status: string }) {
  const MAP: Record<string, { label: string; bg: string; color: string }> = {
    PLANNING:   { label: 'Planning',   bg: 'var(--accent-sun-bg)',    color: 'var(--accent-sun)'    },
    GENERATING: { label: 'Generating', bg: 'var(--accent-sky-bg)',    color: 'var(--accent-sky)'    },
    FINALISED:  { label: 'Finalised',  bg: 'var(--accent-forest-bg)', color: 'var(--accent-forest)' },
    ARCHIVED:   { label: 'Archived',   bg: 'var(--bg-elevated)',      color: 'var(--text-muted)'    },
  }
  const s = MAP[status] ?? MAP.PLANNING
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}
