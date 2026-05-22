// src/lib/calendar.ts
// Google Calendar API integration for Stackwell Booking Widget
// Uses a service account — no user OAuth flow needed

export interface CalendarEvent {
  bookingId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceName: string
  serviceDuration: number // minutes
  bookingDate: string // "YYYY-MM-DD"
  bookingTime: string // "HH:MM"
  staffName?: string
}

interface ServiceAccountCredentials {
  client_email: string
  private_key: string
  token_uri: string
}

// ─── JWT / Token helpers ───────────────────────────────────────────────────

async function getAccessToken(creds: ServiceAccountCredentials, calendarId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: creds.token_uri,
    exp: now + 3600,
    iat: now,
  }))

  const signingInput = `${header}.${payload}`

  // Import private key (PKCS8 PEM)
  const pemBody = creds.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
  const jwt = `${signingInput}.${signature}`

  const tokenRes = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`GCal token fetch failed: ${err}`)
  }

  const { access_token } = await tokenRes.json() as { access_token: string }
  return access_token
}

// ─── Date/time helpers ────────────────────────────────────────────────────

function toRFC3339(date: string, time: string, durationMinutes: number) {
  // date: "YYYY-MM-DD", time: "HH:MM"
  const startISO = `${date}T${time}:00`
  const start = new Date(startISO)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const fmt = (d: Date) => d.toISOString()
  return { start: fmt(start), end: fmt(end) }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Create a Google Calendar event for a confirmed booking.
 * Returns the GCal event ID (store this on the booking for later updates/deletes).
 */
export async function createCalendarEvent(
  event: CalendarEvent,
  env: { GCAL_CREDENTIALS: string; GCAL_CALENDAR_ID: string }
): Promise<string | null> {
  try {
    const creds: ServiceAccountCredentials = JSON.parse(env.GCAL_CREDENTIALS)
    const token = await getAccessToken(creds, creds.token_uri)
    const { start, end } = toRFC3339(event.bookingDate, event.bookingTime, event.serviceDuration)

    const calEvent = {
      summary: `${event.serviceName} — ${event.customerName}`,
      description: [
        `Service: ${event.serviceName}`,
        `Customer: ${event.customerName}`,
        `Phone: ${event.customerPhone}`,
        `Email: ${event.customerEmail}`,
        event.staffName ? `Staff: ${event.staffName}` : null,
        `Booking ID: ${event.bookingId}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: start, timeZone: 'America/Vancouver' },
      end: { dateTime: end, timeZone: 'America/Vancouver' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
        ],
      },
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GCAL_CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calEvent),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('GCal create event failed:', err)
      return null
    }

    const data = await res.json() as { id: string }
    return data.id
  } catch (err) {
    console.error('GCal createCalendarEvent error:', err)
    return null
  }
}

/**
 * Delete a GCal event when a booking is cancelled or no-show.
 */
export async function deleteCalendarEvent(
  gcalEventId: string,
  env: { GCAL_CREDENTIALS: string; GCAL_CALENDAR_ID: string }
): Promise<void> {
  try {
    const creds: ServiceAccountCredentials = JSON.parse(env.GCAL_CREDENTIALS)
    const token = await getAccessToken(creds, creds.token_uri)

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GCAL_CALENDAR_ID)}/events/${gcalEventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!res.ok && res.status !== 404) {
      const err = await res.text()
      console.error('GCal delete event failed:', err)
    }
  } catch (err) {
    console.error('GCal deleteCalendarEvent error:', err)
  }
}

/**
 * Update event summary if status changes (e.g. mark as completed).
 */
export async function updateCalendarEventStatus(
  gcalEventId: string,
  status: 'completed' | 'no-show' | 'cancelled',
  env: { GCAL_CREDENTIALS: string; GCAL_CALENDAR_ID: string }
): Promise<void> {
  try {
    const creds: ServiceAccountCredentials = JSON.parse(env.GCAL_CREDENTIALS)
    const token = await getAccessToken(creds, creds.token_uri)

    // Fetch existing event first
    const getRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GCAL_CALENDAR_ID)}/events/${gcalEventId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!getRes.ok) return

    const existing = await getRes.json() as { summary: string }
    const prefix = status === 'completed' ? '✓' : status === 'no-show' ? '✗ No-show:' : '✗ Cancelled:'
    const newSummary = `${prefix} ${existing.summary}`

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GCAL_CALENDAR_ID)}/events/${gcalEventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary: newSummary }),
      }
    )
  } catch (err) {
    console.error('GCal updateCalendarEventStatus error:', err)
  }
}
