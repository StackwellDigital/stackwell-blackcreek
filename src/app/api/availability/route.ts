import { NextRequest, NextResponse } from 'next/server'
import { getDB, getEnv, generateSlots, isSlotBlocked } from '@/lib/db'
import type { Availability, BlockedTime, Booking } from '@/lib/db'

export const runtime = 'edge'

// GET /api/availability?date=2026-05-20&service_id=1&staff_id=1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const serviceId = searchParams.get('service_id')
  const staffId = searchParams.get('staff_id') || '1'

  if (!date || !serviceId) {
    return NextResponse.json({ error: 'date and service_id required' }, { status: 400 })
  }

  // Reject past dates
  const today = new Date().toISOString().split('T')[0]
  if (date < today) {
    return NextResponse.json({ slots: [] })
  }

  const db = getDB()
  const env = getEnv()
  const interval = parseInt(env.SLOT_INTERVAL || '30')

  try {
    // Get service duration
    const service = await db
      .prepare('SELECT duration FROM services WHERE id = ?')
      .bind(serviceId).first<{ duration: number }>()

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Get availability for this day
    const dow = new Date(date + 'T12:00:00').getDay()
    const avail = await db
      .prepare('SELECT * FROM availability WHERE (staff_id = ? OR staff_id IS NULL) AND day_of_week = ?')
      .bind(staffId, dow).first<Availability>()

    if (!avail) {
      return NextResponse.json({ slots: [] }) // closed that day
    }

    // Generate base slots
    const allSlots = generateSlots(avail.start_time, avail.end_time, interval, service.duration)

    // Get blocked times for this date
    const { results: blocks } = await db
      .prepare(`SELECT * FROM blocked_times WHERE
        (staff_id = ? OR staff_id IS NULL) AND
        (date = ? OR (recurring = 1 AND day_of_week = ?))`)
      .bind(staffId, date, dow).all<BlockedTime>()

    // Get existing bookings for this date
    const { results: existing } = await db
      .prepare(`SELECT booking_time, service_duration FROM bookings
        WHERE booking_date = ? AND (staff_id = ? OR staff_id IS NULL)
        AND status NOT IN ('cancelled')`)
      .all<Pick<Booking, 'booking_time' | 'serv.bind(date, staffId).all<Pick<Booking, 'booking_time' | 'service_duration'>>()ice_duration'>>(date, staffId)

    // Filter out blocked and booked slots
    const available = allSlots.filter((slot) => {
      if (isSlotBlocked(slot, service.duration, blocks, date)) return false

      // Check overlap with existing bookings
      const [sh, sm] = slot.split(':').map(Number)
      const slotStart = sh * 60 + sm
      const slotEnd = slotStart + service.duration

      const overlaps = existing.some((bk) => {
        const [bh, bm] = bk.booking_time.split(':').map(Number)
        const bkStart = bh * 60 + bm
        const bkEnd = bkStart + bk.service_duration
        return slotStart < bkEnd && slotEnd > bkStart
      })

      return !overlaps
    })

    return NextResponse.json({ slots: available })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}
