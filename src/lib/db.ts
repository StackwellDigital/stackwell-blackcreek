import { getRequestContext } from '@cloudflare/next-on-pages'

export interface Env {
  DB: D1Database
  ADMIN_PASSWORD: string
  RESEND_API_KEY: string
  RESEND_FROM: string
  MULTI_STAFF: string
  SHOP_NAME: string
  SLOT_INTERVAL: string
  BOOKING_WINDOW_DAYS: string
  TWILIO_SID?: string
  TWILIO_TOKEN?: string
  TWILIO_FROM?: string
  CANCEL_CUTOFF_HOURS?: string
  SHOP_PHONE?: string
  GCAL_CREDENTIALS?: string
  GCAL_CALENDAR_ID?: string
}

export function getDB(): D1Database {
  const { env } = getRequestContext()
  return (env as unknown as Env).DB
}

export function getEnv(): Env {
  const { env } = getRequestContext()
  return env as unknown as Env
}

// ── Types ──────────────────────────────────────────────

export interface Service {
  id: number
  name: string
  price: number       // cents
  duration: number    // minutes
  active: number
  sort_order: number
}

export interface Staff {
  id: number
  name: string
  bio: string | null
  active: number
}

export interface Availability {
  id: number
  staff_id: number | null
  day_of_week: number
  start_time: string
  end_time: string
}

export interface BlockedTime {
  id: number
  staff_id: number | null
  date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string
  reason: string | null
  recurring: number
}

export interface Booking {
  id: number
  customer_name: string
  customer_phone: string
  customer_email: string
  service_id: number
  service_name: string
  service_price: number
  service_duration: number
  staff_id: number | null
  staff_name: string | null
  booking_date: string
  booking_time: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes: string | null
  created_at: string
}

// ── Slot generation ────────────────────────────────────

export function generateSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  durationMinutes: number
): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let current = sh * 60 + sm
  const end = eh * 60 + em

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    current += intervalMinutes
  }
  return slots
}

export function isSlotBlocked(
  slot: string,
  durationMinutes: number,
  blocks: BlockedTime[],
  date: string
): boolean {
  const [sh, sm] = slot.split(':').map(Number)
  const slotStart = sh * 60 + sm
  const slotEnd = slotStart + durationMinutes

  return blocks.some((b) => {
    const [bsh, bsm] = b.start_time.split(':').map(Number)
    const [beh, bem] = b.end_time.split(':').map(Number)
    const blockStart = bsh * 60 + bsm
    const blockEnd = beh * 60 + bem
    const dateMatch = b.date === date
    const dow = new Date(date + 'T12:00:00').getDay()
    const recurMatch = b.recurring === 1 && b.day_of_week === dow
    return (dateMatch || recurMatch) && slotStart < blockEnd && slotEnd > blockStart
  })
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
