import { useState, useRef, useEffect } from 'react'
import { useChatHistory, useSendMessage, type ChatMessage } from '../hooks/useChat'

interface Props {
  tripId: string
  liveMessages: ChatMessage[]
  isThinking: boolean
}

export default function ChatPanel({ tripId, liveMessages, isThinking }: Props) {
  const { data: history = [] } = useChatHistory(tripId)
  const send = useSendMessage(tripId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const seen = new Set<string>()
  const messages = [...history, ...liveMessages].filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isThinking])

  function handleSend() {
    const text = input.trim()
    if (!text || send.isPending) return
    send.mutate(text)
    setInput('')
  }

  return (
    <div className="flex flex-col overflow-hidden"
         style={{
           background: 'var(--bg-surface)',
           height: 'clamp(420px, calc(100vh - 220px), 580px)',
         }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5"
           style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                 style={{
                   background: 'linear-gradient(135deg, rgba(74,155,111,0.15), rgba(74,155,111,0.05))',
                   border: '1px solid rgba(74,155,111,0.25)',
                 }}>
              ✨
            </div>
            <div>
              <p className="text-sm font-semibold mb-1"
                 style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>
                Your AI travel buddy is ready
              </p>
              <p className="text-xs leading-relaxed"
                 style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
                Ask about the itinerary, request changes, or get local tips
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                        className="text-xs px-3.5 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          fontFamily: 'Sora, sans-serif',
                          lineHeight: 1.4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-forest)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isThinking && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 shrink-0"
           style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex gap-2 items-end">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your trip…"
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.85rem',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-forest)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || send.isPending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-forest), #357a52)',
              color: '#fff',
              boxShadow: input.trim() ? '0 4px 12px rgba(74,155,111,0.35)' : 'none',
            }}
          >
            {send.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '↑'}
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center"
           style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif', opacity: 0.45, fontSize: '0.7rem' }}>
          30 msg/min · visible to all members
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isAI = msg.senderType === 'AI'
  return (
    <div className={`flex gap-2.5 items-end ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mb-5"
           style={{
             background: isAI
               ? 'linear-gradient(135deg, rgba(74,155,111,0.25), rgba(74,155,111,0.1))'
               : 'linear-gradient(135deg, var(--accent-sky), #4a7fc4)',
             color: isAI ? 'var(--accent-forest)' : '#fff',
             border: isAI ? '1px solid rgba(74,155,111,0.3)' : 'none',
             fontSize: '0.75rem',
           }}>
        {isAI ? '✨' : (msg.sender?.name?.[0]?.toUpperCase() ?? '?')}
      </div>

      <div className={`max-w-[78%] flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
        <p className="text-xs mb-1 mx-1 font-medium"
           style={{
             color: isAI ? 'var(--accent-forest)' : 'var(--accent-sky)',
             fontFamily: 'Sora, sans-serif',
             fontSize: '0.7rem',
             letterSpacing: '0.02em',
           }}>
          {isAI ? 'AI Assistant' : (msg.sender?.name ?? 'You')}
        </p>
        <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
             style={{
               background: isAI ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent-forest), #357a52)',
               color: isAI ? 'var(--text-primary)' : '#fff',
               borderRadius: isAI ? '6px 18px 18px 18px' : '18px 6px 18px 18px',
               fontFamily: 'Sora, sans-serif',
               fontSize: '0.85rem',
               boxShadow: isAI ? 'none' : '0 2px 8px rgba(74,155,111,0.25)',
             }}>
          {msg.content}
        </div>
        <p className="text-xs mt-1 mx-1"
           style={{
             color: 'var(--text-muted)',
             fontFamily: 'Sora, sans-serif',
             textAlign: isAI ? 'left' : 'right',
             opacity: 0.5,
             fontSize: '0.68rem',
           }}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs"
           style={{
             background: 'linear-gradient(135deg, rgba(74,155,111,0.25), rgba(74,155,111,0.1))',
             border: '1px solid rgba(74,155,111,0.3)',
             color: 'var(--accent-forest)',
           }}>
        ✨
      </div>
      <div className="px-4 py-3.5"
           style={{ background: 'var(--bg-elevated)', borderRadius: '6px 18px 18px 18px' }}>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                 style={{ background: 'var(--accent-forest)', animationDelay: `${i * 150}ms`, opacity: 0.7 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  '💡 What are the must-try local foods?',
  '🌦️ What\'s the weather like during our trip?',
  '🚌 How do we get around cheaply?',
]
