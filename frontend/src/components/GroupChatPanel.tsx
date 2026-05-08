import { useState, useRef, useEffect } from 'react'
import { useGroupChatHistory, useSendGroupMessage, type GroupMessage } from '../hooks/useGroupChat'
import { useAuth } from '../hooks/useAuth'

interface Props {
  tripId: string
  liveMessages: GroupMessage[]
}

export default function GroupChatPanel({ tripId, liveMessages }: Props) {
  const { user } = useAuth()
  const { data: history = [] } = useGroupChatHistory(tripId)
  const send = useSendGroupMessage(tripId)
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
  }, [messages.length])

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
                   background: 'linear-gradient(135deg, rgba(91,155,213,0.15), rgba(91,155,213,0.05))',
                   border: '1px solid rgba(91,155,213,0.2)',
                 }}>
              🌍
            </div>
            <div>
              <p className="text-sm font-semibold mb-1"
                 style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>
                Start the conversation
              </p>
              <p className="text-xs leading-relaxed"
                 style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif' }}>
                Coordinate with your travel crew here
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <GroupMessageBubble key={msg.id} msg={msg} isMe={msg.senderId === user?.id} />
        ))}
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
            placeholder="Message your crew…"
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.85rem',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-sky)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || send.isPending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-sky), #4a7fc4)',
              color: '#fff',
              boxShadow: input.trim() ? '0 4px 12px rgba(91,155,213,0.35)' : 'none',
            }}
          >
            {send.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GroupMessageBubble({ msg, isMe }: { msg: GroupMessage; isMe: boolean }) {
  const initial = msg.sender.name[0]?.toUpperCase() ?? '?'

  // Deterministic pastel color from name
  const colors = [
    '#4A9B6F', '#5B9BD5', '#E8834A', '#9B6FD4', '#D4726F', '#5BA89B', '#D4A84B'
  ]
  const colorIndex = msg.sender.name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length
  const avatarColor = colors[colorIndex]

  return (
    <div className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isMe && (
        msg.sender.avatarUrl ? (
          <img src={msg.sender.avatarUrl} alt={msg.sender.name}
               className="w-7 h-7 rounded-full shrink-0 object-cover mb-5" />
        ) : (
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mb-5"
               style={{ background: avatarColor, color: '#fff', fontSize: '0.7rem' }}>
            {initial}
          </div>
        )
      )}

      {/* Bubble */}
      <div className={`max-w-[76%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <p className="text-xs mb-1 ml-1 font-medium"
             style={{ color: avatarColor, fontFamily: 'Sora, sans-serif', fontSize: '0.7rem', letterSpacing: '0.02em' }}>
            {msg.sender.name}
          </p>
        )}
        <div className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
             style={{
               background: isMe
                 ? 'linear-gradient(135deg, var(--accent-sky), #4a7fc4)'
                 : 'var(--bg-elevated)',
               color: isMe ? '#fff' : 'var(--text-primary)',
               borderRadius: isMe ? '18px 6px 18px 18px' : '6px 18px 18px 18px',
               fontFamily: 'Sora, sans-serif',
               fontSize: '0.85rem',
               boxShadow: isMe ? '0 2px 8px rgba(91,155,213,0.2)' : 'none',
             }}>
          {msg.content}
        </div>
        <p className="text-xs mt-1 mx-1"
           style={{ color: 'var(--text-muted)', fontFamily: 'Sora, sans-serif',
                    textAlign: isMe ? 'right' : 'left', opacity: 0.5, fontSize: '0.68rem' }}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
