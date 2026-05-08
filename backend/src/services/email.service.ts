import { Resend } from 'resend'
import nodemailer from 'nodemailer'

// ── Resend client (optional) ──────────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// ── Nodemailer SMTP transporter (Gmail app password) ─────────────────────────
function createSmtpTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendInviteEmail(opts: {
  to: string
  tripName: string
  destination: string
  creatorName: string
  inviteUrl: string
}) {
  const { to, tripName, destination, creatorName, inviteUrl } = opts
  const html = buildEmailHtml({ tripName, destination, creatorName, inviteUrl })
  const subject = `You've been invited to plan ${tripName} on TripUntangle!`

  // 1️⃣ Try Resend first (cloud-friendly, free tier 3000 emails/month)
  if (resend) {
    const result = await resend.emails.send({
      from: 'TripUntangle <onboarding@resend.dev>',
      to,
      subject,
      html,
    })
    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`)
    }
    console.log(`[Email] Sent via Resend → ${to}`)
    return { success: true, via: 'resend' }
  }

  // 2️⃣ Fallback: Gmail SMTP
  const smtp = createSmtpTransport()
  if (smtp) {
    await smtp.sendMail({
      from: `"TripUntangle" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email] Sent via Gmail SMTP → ${to}`)
    return { success: true, via: 'smtp' }
  }

  // 3️⃣ No email provider configured — log invite link so owner can share manually
  console.log(`[Email] No provider configured. Invite link for ${to}: ${inviteUrl}`)
  throw new Error('No email provider configured. Add SMTP_USER+SMTP_PASS (Gmail) or RESEND_API_KEY to .env')
}

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
