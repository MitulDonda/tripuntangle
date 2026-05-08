import { useState } from 'react'
import { api } from '../lib/api'

interface Props {
  tripId: string
  onClose: () => void
}

export default function OooModal({ tripId, onClose }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/trips/${tripId}/ooo`)
      setText(res.data.ooo)
    } catch {
      setError('Failed to generate. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openGmail() {
    const subject = encodeURIComponent("Out of Office — Off on an Adventure!")
    const body = encodeURIComponent(text)
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">✉️</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                OOO Email Generator
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Let your inbox know you're off exploring
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-lg transition hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="p-6">
          {!text && !loading && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">🏖️</div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Generate a fun, ready-to-use out-of-office email for your trip.
              </p>
              {error && <p className="text-sm mb-3" style={{ color: 'var(--accent-bloom)' }}>{error}</p>}
              <button onClick={generate}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90"
                      style={{ background: 'var(--accent-forest)', color: '#fff' }}>
                ✨ Generate OOO Email
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
                   style={{ borderColor: 'var(--accent-forest)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Writing your OOO…</p>
            </div>
          )}

          {text && !loading && (
            <div className="flex flex-col gap-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex gap-2">
                <button onClick={copy}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-90"
                        style={{ background: copied ? 'var(--accent-forest-bg)' : 'var(--bg-elevated)',
                                 color: copied ? 'var(--accent-forest)' : 'var(--text-muted)',
                                 border: '1px solid var(--border)' }}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button onClick={openGmail}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-90"
                        style={{ background: 'var(--accent-sky)', color: '#fff' }}>
                  📧 Open in Gmail
                </button>
                <button onClick={generate}
                        className="px-4 py-2.5 rounded-xl text-sm transition hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  🔄
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
