// src/app/api/bookings/cancel/route.ts
import { getDB } from '@/lib/db'
import { sendCancellationEmail } from '@/lib/email'
import { deleteCalendarEvent } from '@/lib/calendar'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface Booking {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_name: string
  service_price: number
  service_duration: number
  booking_date: string
  booking_time: string
  status: string
  gcal_event_id: string | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const email = searchParams.get('email')

  if (!id || !email) {
    return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
  }

  const env = process.env as unknown as Env
  const db = getDB(env)

  const booking = await db
    .prepare('SELECT * FROM bookings WHERE id = ? AND customer_email = ?')
    .bind(id, decodeURIComponent(email))
    .first<Booking>()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 409 })
  }

  return NextResponse.json({ booking })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { id: string; email: string }
  const { id, email } = body

  if (!id || !email) {
    return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
  }

  const env = process.env as unknown as Env
  const db = getDB(env)
  const cutoffHours = parseInt(env.CANCEL_CUTOFF_HOURS ?? '24', 10)

  const booking = await db
    .prepare('SELECT * FROM bookings WHERE id = ? AND customer_email = ?')
    .bind(id, email)
    .first<Booking>()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 409 })
  }

  // 24hr cutoff check
  const apptDateTime = new Date(`${booking.booking_date}T${booking.booking_time}:00`)
  const now = new Date()
  const hoursUntil = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntil < cutoffHours) {
    return NextResponse.json(
      {
        error: 'too_close',
        message: `Cancellations must be made at least ${cutoffHours} hours in advance. Please call the shop directly.`,
        phone: env.SHOP_PHONE ?? '',
      },
      { status: 422 }
    )
  }

  // Update DB
  await db
    .prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?")
    .bind(id)
    .run()

  // Delete GCal event
  if (booking.gcal_event_id && env.GCAL_CREDENTIALS && env.GCAL_CALENDAR_ID) {
    await deleteCalendarEvent(booking.gcal_event_id, env as any)
  }

  // Send cancellation email
  try {
    await sendCancellationEmail({
      to: booking.customer_email,
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      shopName: env.SHOP_NAME,
      resendApiKey: env.RESEND_API_KEY,
      resendFrom: env.RESEND_FROM,
    })
  } catch (err) {
    console.error('Cancellation email failed:', err)
    // Non-fatal — booking is already cancelled in DB
  }

  return NextResponse.json({ success: true })
}
