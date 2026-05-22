import { NextRequest, NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/db'
import type { Booking } from '@/lib/db'
import { getResend, sendConfirmationEmail, sendSMSConfirmation } from '@/lib/email'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any
    const {
      customer_name,
      customer_phone,
      customer_email,
      service_id,
      staff_id,
      booking_date,
      booking_time,
      notes,
    } = body

    if (!customer_name || !customer_phone || !customer_email || !service_id || !booking_date || !booking_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = getDB()
    const env = getEnv()

    const conflict = await db
      .prepare(`SELECT id FROM bookings
        WHERE booking_date = ? AND booking_time = ? AND status != 'cancelled'
        ${staff_id ? 'AND staff_id = ?' : ''}`)
      .first(booking_date, booking_time, ...(staff_id ? [staff_id] : []))

    if (conflict) {
      return NextResponse.json({ error: 'That slot was just taken — please pick another time' }, { status: 409 })
    }

    const service = await db
      .prepare('SELECT * FROM services WHERE id = ?')
      .bind(service_id).first<{ id: number; name: string; price: number; duration: number }>()

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    let staffName: string | null = null
    if (staff_id) {
      const staff = await db
        .prepare('SELECT name FROM staff WHERE id = ?')
        .bind(staff_id).first<{ name: string }>()
      staffName = staff?.name || null
    }

    const result = await db
      .prepare(`INSERT INTO bookings
        (customer_name, customer_phone, customer_email,
         service_id, service_name, service_price, service_duration,
         staff_id, staff_name, booking_date, booking_time, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
        RETURNING *`)
      .first<Booking>(
        customer_name, customer_phone, customer_email,
        service.id, service.name, service.price, service.duration,
        staff_id || null, staffName,
        booking_date, booking_time, notes || null
      )

    if (!result) {
      throw new Error('Insert failed')
    }

    if (env.RESEND_API_KEY) {
      const resend = getResend(env.RESEND_API_KEY)
      const siteUrl = req.headers.get('origin') || 'https://yourdomain.com'
      sendConfirmationEmail(result, env.SHOP_NAME, resend, env.RESEND_FROM, siteUrl).catch(console.error)
    }

    if (env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM) {
      sendSMSConfirmation(result, env.SHOP_NAME, env.TWILIO_SID, env.TWILIO_TOKEN, env.TWILIO_FROM).catch(console.error)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
