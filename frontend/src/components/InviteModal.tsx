import { useState } from 'react'
import { useInviteMembers } from '../hooks/useInvite'

interface InviteResult {
  email?: string
  status?: string
  reason?: string
  inviteUrl?: string
  error?: string
}

interface Props {
  tripId: string
  inviteCode: string
  shortCode: string
  onClose: () => void
}

export default function InviteModal({ tripId, inviteCode, shortCode, onClose }: Props) {
  const [emailInput, setEmailInput] = useState('')
  const [results, setResults]       = useState<InviteResult[]>([])
  const [copied, setCopied]         = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const invite = useInviteMembers(tripId)

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSend() {
    const emails = emailInput
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'))
    if (!emails.length) return

    try {
      const data = await invite.mutateAsync(emails)
      setResults(data.results ?? [])
      setEmailInput('')
    } catch {
      setResults([{ error: 'Failed to contact server. Check your connection.' }])
    }
  }

  function copyResult(url: string) {
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const hasFailed = results.some((r) => r.status === 'email_failed')
  const allSent   = results.length > 0 && results.every((r) => r.status === 'sent' || r.status === 'already_member')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          maxHeight: '88vh',
        }}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header — sticky */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            👥 Invite Members
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-60 text-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Share link */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2"
               style={{ color: 'var(--text-muted)' }}>
              Share invite link
            </p>
            {/* URL row */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span className="flex-1 text-xs font-mono break-all leading-snug"
                    style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {inviteUrl}
              </span>
              <button
                onClick={copyLink}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                style={{
                  background: copied ? 'var(--accent-forest)' : 'var(--bg-surface)',
                  color: copied ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  minWidth: '64px',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {/* Short code */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Or share code:</span>
              <span
                className="font-mono font-bold text-sm px-2 py-0.5 rounded"
                style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun)' }}
              >
                {shortCode}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>or invite by email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2"
                   style={{ color: 'var(--text-muted)' }}>
              Email addresses
            </label>
            <textarea
              rows={3}
              placeholder="friend@email.com, another@email.com"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setResults([]) }}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Separate multiple emails with commas
            </p>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              {allSent && (
                <div className="px-3 py-2.5 rounded-xl text-sm font-medium"
                     style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)', border: '1px solid var(--accent-forest)' }}>
                  ✓ Invites sent successfully!
                </div>
              )}
              {results.map((r, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                     style={{
                       background: r.status === 'sent' ? 'var(--accent-forest-bg)' : r.status === 'already_member' ? 'var(--accent-sky-bg)' : 'var(--accent-bloom-bg)',
                       border: `1px solid ${r.status === 'sent' ? 'var(--accent-forest)' : r.status === 'already_member' ? 'var(--accent-sky)' : 'var(--accent-bloom)'}`,
                       color: r.status === 'sent' ? 'var(--accent-forest)' : r.status === 'already_member' ? 'var(--accent-sky)' : 'var(--accent-bloom)',
                     }}>
                  <span className="font-semibold break-all">{r.email}</span>
                  {r.status === 'sent'           && <span> — ✓ Email sent</span>}
                  {r.status === 'already_member' && <span> — already a member</span>}
                  {r.status === 'email_failed'   && (
                    <span> — email failed: <span style={{ color: 'var(--text-muted)' }}>{r.reason ?? 'unknown error'}</span></span>
                  )}
                </div>
              ))}

              {/* Manual share fallback */}
              {hasFailed && (
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    📋 Share this link manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs font-mono break-all leading-snug"
                          style={{ color: 'var(--accent-sky)', wordBreak: 'break-all' }}>
                      {inviteUrl}
                    </span>
                    <button
                      onClick={() => copyResult(inviteUrl)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                      style={{
                        background: linkCopied ? 'var(--accent-forest)' : 'var(--bg-surface)',
                        color: linkCopied ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        minWidth: '52px',
                      }}
                    >
                      {linkCopied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — sticky */}
        <div className="flex gap-3 px-5 py-4 shrink-0"
             style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Close
          </button>
          <button
            onClick={handleSend}
            disabled={invite.isPending || !emailInput.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--accent-forest)', color: '#fff' }}
          >
            {invite.isPending ? 'Sending…' : 'Send Invites'}
          </button>
        </div>
      </div>
    </div>
  )
}
