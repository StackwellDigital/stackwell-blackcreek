import { Resend } from 'resend'
import type { Booking } from './db'

export function getResend(apiKey: string) {
  return new Resend(apiKey)
}

export function generateICS(booking: Booking, shopName: string): string {
  const [year, month, day] = booking.booking_date.split('-').map(Number)
  const [hour, minute] = booking.booking_time.split(':').map(Number)
  const start = new Date(year, month - 1, day, hour, minute)
  const end = new Date(start.getTime() + booking.service_duration * 60000)

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stackwell//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}-${booking.booking_date}@stackwell`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${booking.service_name} at ${shopName}`,
    `DESCRIPTION:Your ${booking.service_name} appointment with ${booking.staff_name || shopName}.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export async function sendConfirmationEmail(
  booking: Booking,
  shopName: string,
  resend: Resend,
  from: string,
  siteUrl: string
): Promise<void> {
  const ics = generateICS(booking, shopName)
  const cancelUrl = `${siteUrl}/cancel?id=${booking.id}&email=${encodeURIComponent(booking.customer_email)}`

  const [h, m] = booking.booking_time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const timeDisplay = `${h12}:${String(m).padStart(2, '0')} ${ampm}`

  const dateDisplay = new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  await resend.emails.send({
    from,
    to: booking.customer_email,
    subject: `Appointment confirmed — ${timeDisplay}, ${dateDisplay}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#1a1a1a;padding:28px 32px">
      <p style="margin:0;font-size:13px;color:#c8a96e;font-weight:500;letter-spacing:.08em;text-transform:uppercase">${shopName}</p>
      <h1 style="margin:8px 0 0;font-size:22px;color:#fff;font-weight:500">You're booked!</h1>
    </div>
    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #f0f0f0">Service</td><td style="padding:8px 0;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${booking.service_name}</td></tr>
        ${booking.staff_name ? `<tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #f0f0f0">Barber</td><td style="padding:8px 0;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${booking.staff_name}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #f0f0f0">Date</td><td style="padding:8px 0;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${dateDisplay}</td></tr>
        <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #f0f0f0">Time</td><td style="padding:8px 0;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${timeDisplay}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Total</td><td style="padding:8px 0;font-weight:600;text-align:right;color:#1a1a1a">$${(booking.service_price / 100).toFixed(0)}</td></tr>
      </table>
      <div style="margin:24px 0;display:flex;gap:10px">
        <a href="data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}" download="appointment.ics"
           style="display:inline-block;padding:11px 20px;background:#c8a96e;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500">
          Add to calendar
        </a>
        <a href="${cancelUrl}"
           style="display:inline-block;padding:11px 20px;border:1px solid #e0e0e0;color:#666;text-decoration:none;border-radius:8px;font-size:13px">
          Cancel / reschedule
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#aaa">Questions? Reply to this email or give us a call.</p>
    </div>
  </div>
</body>
</html>`,
    attachments: [
      {
        filename: 'appointment.ics',
        content: Buffer.from(ics).toString('base64'),
      },
    ],
  })
}

export async function sendAdminNotification(
  booking: Booking,
  shopName: string,
  resend: Resend,
  from: string,
  adminEmail: string
): Promise<void> {
  await resend.emails.send({
    from,
    to: adminEmail,
    subject: `New booking — ${booking.customer_name}, ${booking.booking_time}`,
    html: `
<p>New booking received for <strong>${shopName}</strong>:</p>
<ul>
  <li><strong>Customer:</strong> ${booking.customer_name} (${booking.customer_phone})</li>
  <li><strong>Service:</strong> ${booking.service_name}</li>
  <li><strong>Date:</strong> ${booking.booking_date} at ${booking.booking_time}</li>
  ${booking.staff_name ? `<li><strong>Barber:</strong> ${booking.staff_name}</li>` : ''}
</ul>`,
  })
}

// Optional Twilio SMS
export async function sendSMSConfirmation(
  booking: Booking,
  shopName: string,
  twilioSid: string,
  twilioToken: string,
  twilioFrom: string
): Promise<void> {
  const [h, m] = booking.booking_time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const timeStr = `${h12}:${String(m).padStart(2, '0')} ${ampm}`

  const body = `${shopName}: Your ${booking.service_name} is confirmed for ${booking.booking_date} at ${timeStr}. Reply CANCEL to cancel.`

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: booking.customer_phone, From: twilioFrom, Body: body }),
  })

  if (!resp.ok) {
    console.error('Twilio SMS failed:', await resp.text())
  }
}

// ─── Cancellation Email ───────────────────────────────────────────────────

interface CancellationEmailParams {
  to: string
  customerName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  shopName: string
  resendApiKey: string
  resendFrom: string
}

function formatDateReadable(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTimeReadable(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export async function sendCancellationEmail(params: CancellationEmailParams) {
  const {
    to, customerName, serviceName, bookingDate,
    bookingTime, shopName, resendApiKey, resendFrom,
  } = params

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#1a1a1a;padding:28px 32px">
      <p style="margin:0;font-size:13px;color:#c8a96e;font-weight:500;letter-spacing:.08em;text-transform:uppercase">${shopName}</p>
      <h1 style="margin:8px 0 0;font-size:22px;color:#fff;font-weight:500">Appointment Cancelled</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#555;font-size:14px;">Hi ${customerName}, your appointment has been cancelled as requested.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #f0f0f0">Service</td><td style="padding:8px 0;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${serviceName}</td></tr>
        <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #f0f0f0">Date</td><td style="padding:8px 0;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${formatDateReadable(bookingDate)}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Time</td><td style="padding:8px 0;font-weight:500;text-align:right">${formatTimeReadable(bookingTime)}</td></tr>
      </table>
      <div style="margin:24px 0">
        <a href="${baseUrl}" style="display:inline-block;padding:11px 20px;background:#c8a96e;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500">
          Book again
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#aaa">Questions? Reply to this email or give us a call.</p>
    </div>
  </div>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to,
      subject: `Cancellation Confirmed — ${shopName}`,
      html,
    }),
  })
}