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

  const hasFailed  = results.some((r) => r.status === 'email_failed')
  const allSent    = results.length > 0 && results.every((r) => r.status === 'sent' || r.status === 'already_member')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 max-h-[90vh] overflow-y-auto"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>👥 Invite Members</h2>
          <button onClick={onClose} className="text-xl transition hover:opacity-60"
                  style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Share link */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Share invite link</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg text-xs truncate"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {inviteUrl}
            </div>
            <button onClick={copyLink}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition hover:opacity-80 shrink-0"
                    style={{ background: copied ? 'var(--accent-forest)' : 'var(--bg-elevated)',
                             color: copied ? '#fff' : 'var(--text-primary)',
                             border: '1px solid var(--border)' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Or share code: <span className="font-mono font-bold" style={{ color: 'var(--accent-sun)' }}>{shortCode}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or invite by email</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Email input */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Email addresses
          </label>
          <textarea rows={3} placeholder="friend@email.com, another@email.com"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setResults([]) }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Separate multiple emails with commas</p>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {allSent && (
              <div className="px-3 py-2 rounded-lg text-sm"
                   style={{ background: 'var(--accent-forest-bg)', color: 'var(--accent-forest)', border: '1px solid var(--accent-forest)' }}>
                ✓ Invites sent successfully!
              </div>
            )}
            {results.map((r, i) => (
              <div key={i} className="px-3 py-2 rounded-lg text-xs"
                   style={{
                     background: r.status === 'sent' ? 'var(--accent-forest-bg)' : r.status === 'already_member' ? 'var(--accent-sky-bg)' : 'var(--accent-bloom-bg)',
                     border: `1px solid ${r.status === 'sent' ? 'var(--accent-forest)' : r.status === 'already_member' ? 'var(--accent-sky)' : 'var(--accent-bloom)'}`,
                     color: r.status === 'sent' ? 'var(--accent-forest)' : r.status === 'already_member' ? 'var(--accent-sky)' : 'var(--accent-bloom)',
                   }}>
                <span className="font-medium">{r.email}</span>
                {r.status === 'sent'           && ' — ✓ Email sent'}
                {r.status === 'already_member' && ' — already a member'}
                {r.status === 'email_failed'   && (
                  <span> — email failed: <span style={{ color: 'var(--text-muted)' }}>{r.reason ?? 'unknown error'}</span></span>
                )}
              </div>
            ))}

            {/* If any email failed, show the invite link prominently for manual sharing */}
            {hasFailed && (
              <div className="mt-1 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  📋 Share this link manually:
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 text-xs px-2 py-1.5 rounded truncate"
                       style={{ background: 'var(--bg-base)', color: 'var(--accent-sky)' }}>
                    {inviteUrl}
                  </div>
                  <button onClick={() => copyResult(inviteUrl)}
                          className="px-3 py-1.5 rounded text-xs font-medium transition hover:opacity-80 shrink-0"
                          style={{ background: linkCopied ? 'var(--accent-forest)' : 'var(--bg-surface)',
                                   color: linkCopied ? '#fff' : 'var(--text-muted)',
                                   border: '1px solid var(--border)' }}>
                    {linkCopied ? '✓' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  To enable email: add <code style={{ color: 'var(--accent-sun)' }}>SMTP_USER</code> + <code style={{ color: 'var(--accent-sun)' }}>SMTP_PASS</code> (Gmail App Password) to your <code>.env</code>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-80"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Close
          </button>
          <button onClick={handleSend} disabled={invite.isPending || !emailInput.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--accent-forest)', color: '#fff' }}>
            {invite.isPending ? 'Sending…' : 'Send Invites'}
          </button>
        </div>
      </div>
    </div>
  )
}
