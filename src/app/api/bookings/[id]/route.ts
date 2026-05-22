import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import type { Booking } from '@/lib/db'

export const runtime = 'edge'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDB()
    const body = await req.json() as any
    const { status } = body

    const valid = ['confirmed', 'completed', 'cancelled', 'no-show']
    if (!valid.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const result = await db
      .prepare('UPDATE bookings SET status = ? WHERE id = ? RETURNING *')
      .first<Booking>(status, id)

    if (!result) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDB()
    const booking = await db
      .prepare('SELECT * FROM bookings WHERE id = ?')
      .first<Booking>(id)

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: booking.id,
      customer_name: booking.customer_name,
      service_name: booking.service_name,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: booking.status,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to get booking' }, { status: 500 })
  }
}
