import https from 'https'
import nodemailer from 'nodemailer'

// ── Brevo (HTTP API) ──────────────────────────────────────────────────────────
async function sendViaBrevo(opts: {
  to: string; subject: string; html: string
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY not set')

  const body = JSON.stringify({
    sender:      { name: 'TripUntangle', email: process.env.SMTP_USER || 'ai.mdonda93@gmail.com' },
    to:          [{ email: opts.to }],
    subject:     opts.subject,
    htmlContent: opts.html,
  })

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path:     '/v3/smtp/email',
        method:   'POST',
        headers: {
          'accept':       'application/json',
          'content-type': 'application/json',
          'api-key':      apiKey,
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
          } else {
            reject(new Error(`Brevo ${res.statusCode}: ${data}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ── Gmail SMTP (port 587 / STARTTLS) ─────────────────────────────────────────
function createSmtpTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({
    host:       'smtp.gmail.com',
    port:       587,
    secure:     false,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  })
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function sendInviteEmail(opts: {
  to: string
  tripName: string
  destination: string
  creatorName: string
  inviteUrl: string
}) {
  const { to, tripName, destination, creatorName, inviteUrl } = opts
  const html    = buildEmailHtml({ tripName, destination, creatorName, inviteUrl })
  const subject = `You've been invited to plan ${tripName} on TripUntangle!`

  const errors: string[] = []

  // 1️⃣ Brevo HTTP API (no SMTP ports — works on all cloud hosts)
  if (process.env.BREVO_API_KEY) {
    try {
      await sendViaBrevo({ to, subject, html })
      console.log(`[Email] Sent via Brevo → ${to}`)
      return { success: true, via: 'brevo' }
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      console.warn(`[Email] Brevo failed (${msg}), trying SMTP…`)
      errors.push(`Brevo: ${msg}`)
    }
  }

  // 2️⃣ Gmail SMTP fallback
  const smtp = createSmtpTransport()
  if (smtp) {
    try {
      await smtp.sendMail({
        from:    `"TripUntangle" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      })
      console.log(`[Email] Sent via Gmail SMTP → ${to}`)
      return { success: true, via: 'smtp' }
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      console.warn(`[Email] SMTP failed: ${msg}`)
      errors.push(`SMTP: ${msg}`)
    }
  }

  // 3️⃣ Nothing worked
  console.log(`[Email] All providers failed for ${to}. Invite link: ${inviteUrl}`)
  const detail = errors.length ? errors.join(' | ') : 'No email provider configured'
  throw new Error(detail)
}

// ── Email template ────────────────────────────────────────────────────────────
function buildEmailHtml(opts: {
  tripName: string
  destination: string
  creatorName: string
  inviteUrl: string
}) {
  const { tripName, destination, creatorName, inviteUrl } = opts
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0D1117;font-family:Inter,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B22;border-radius:16px;border:1px solid #30363D;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">✈️</div>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#E6EDF3;">You're invited!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 16px;color:#7D8590;line-height:1.6;">
              <strong style="color:#E6EDF3;">${creatorName}</strong> has invited you to help plan
            </p>
            <div style="background:#21262D;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #30363D;">
              <h2 style="margin:0 0 4px;font-size:20px;color:#E6EDF3;">${tripName}</h2>
              <p style="margin:0;color:#5B9BD5;font-size:14px;">📍 ${destination}</p>
            </div>
            <p style="margin:0 0 24px;color:#7D8590;line-height:1.6;font-size:14px;">
              Fill in your preferences — dates, budget, vibe, and dietary needs — so the AI can build a trip everyone will love.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${inviteUrl}" style="display:inline-block;background:#3D8B5E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                  Join Trip &amp; Submit Preferences →
                </a>
              </td></tr>
            </table>
            <p style="margin:20px 0 0;text-align:center;color:#7D8590;font-size:12px;">
              Or copy this link: <a href="${inviteUrl}" style="color:#5B9BD5;">${inviteUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px;text-align:center;border-top:1px solid #30363D;">
            <p style="margin:0;color:#7D8590;font-size:12px;">
              This invite expires in 14 days. Powered by <strong>TripUntangle</strong>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
