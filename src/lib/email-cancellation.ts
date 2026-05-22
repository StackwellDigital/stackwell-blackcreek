// ─── ADD THIS TO src/lib/email.ts ─────────────────────────────────────────
//
// Drop this function into your existing email.ts alongside sendConfirmationEmail

interface CancellationEmailParams {
  to: string
  customerName: string
  serviceName: string
  bookingDate: string  // "YYYY-MM-DD"
  bookingTime: string  // "HH:MM"
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

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        
        <!-- Header -->
        <tr><td style="background:#111;padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">${shopName}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;font-size:1.1rem;color:#111;">Appointment Cancelled</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:0.95rem;">
            Hi ${customerName}, your appointment has been cancelled as requested.
          </p>

          <!-- Summary -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:8px;padding:20px;">
            <tr>
              <td style="color:#6b7280;font-size:0.875rem;padding-bottom:10px;">Service</td>
              <td style="font-weight:600;font-size:0.875rem;text-align:right;padding-bottom:10px;">${serviceName}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:0.875rem;padding-bottom:10px;border-top:1px solid #e5e7eb;padding-top:10px;">Date</td>
              <td style="font-weight:600;font-size:0.875rem;text-align:right;border-top:1px solid #e5e7eb;padding-top:10px;">${formatDateReadable(bookingDate)}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:0.875rem;border-top:1px solid #e5e7eb;padding-top:10px;">Time</td>
              <td style="font-weight:600;font-size:0.875rem;text-align:right;border-top:1px solid #e5e7eb;padding-top:10px;">${formatTimeReadable(bookingTime)}</td>
            </tr>
          </table>

          <p style="margin:24px 0 0;color:#6b7280;font-size:0.875rem;">
            Want to book again? <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ''}" style="color:#111;font-weight:600;">Schedule a new appointment</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:0.8rem;">
            ${shopName} · Powered by Stackwell
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
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


// ─── RESCHEDULE PRE-FILL — ADD TO src/app/page.tsx ────────────────────────
//
// At the top of your booking flow component, add this useEffect to detect
// reschedule params and pre-fill the form:
//
// const searchParams = useSearchParams()
// const rescheduleId = searchParams.get('reschedule')
//
// useEffect(() => {
//   if (!rescheduleId) return
//   const email = searchParams.get('email') ?? ''
//   const name = searchParams.get('name') ?? ''
//
//   // Pre-fill contact info
//   setContactInfo({ name, email, phone: '', returning: true })
//
//   // Skip straight to date/time step (step 2, after service selection)
//   // You'll still need them to pick a service + new time
//   // Optionally auto-select their previous service if you pass it in the URL
// }, [rescheduleId])
//
// Also add NEXT_PUBLIC_BASE_URL to your .env.local:
// NEXT_PUBLIC_BASE_URL=https://yourdomain.com


// ─── WRANGLER.TOML — add this var ─────────────────────────────────────────
//
// [vars]
// CANCEL_CUTOFF_HOURS = "24"
// SHOP_PHONE = "+16045550000"   ← barber's phone number
