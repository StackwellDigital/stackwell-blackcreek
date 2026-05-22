// ─── bookings/route.ts — POST handler additions ───────────────────────────
//
// 1. Add import at top:
import { createCalendarEvent } from '@/lib/calendar'

// 2. After successful INSERT and email send, add:

const gcalEventId = await createCalendarEvent(
  {
    bookingId: booking.id,
    customerName: body.name,
    customerEmail: body.email,
    customerPhone: body.phone,
    serviceName: service.name,
    serviceDuration: service.duration_minutes,
    bookingDate: body.date,
    bookingTime: body.time,
  },
  env // your existing env binding
)

if (gcalEventId) {
  await db
    .prepare('UPDATE bookings SET gcal_event_id = ? WHERE id = ?')
    .bind(gcalEventId, booking.id)
    .run()
}

// ─── bookings/[id]/route.ts — PATCH handler additions ────────────────────
//
// 1. Add imports at top:
import { deleteCalendarEvent, updateCalendarEventStatus } from '@/lib/calendar'

// 2. After updating status in DB, add:

const { gcal_event_id } = await db
  .prepare('SELECT gcal_event_id FROM bookings WHERE id = ?')
  .bind(params.id)
  .first<{ gcal_event_id: string | null }>() ?? {}

if (gcal_event_id) {
  if (body.status === 'cancelled') {
    await deleteCalendarEvent(gcal_event_id, env)
  } else if (body.status === 'completed' || body.status === 'no-show') {
    await updateCalendarEventStatus(gcal_event_id, body.status, env)
  }
}
