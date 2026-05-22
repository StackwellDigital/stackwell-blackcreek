import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import type { Booking, BlockedTime } from '@/lib/db'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action') || 'bookings'
  const db = getDB()

  try {
    switch (action) {
      case 'bookings': {
        const date = searchParams.get('date')
        const status = searchParams.get('status')
        let query = 'SELECT * FROM bookings WHERE 1=1'
        const args: unknown[] = []
        if (date) { query += ' AND booking_date = ?'; args.push(date) }
        if (status) { query += ' AND status = ?'; args.push(status) }
        query += ' ORDER BY booking_date, booking_time'
        const { results } = await db.prepare(query).all<Booking>(...args)
        return NextResponse.json(results)
      }

      case 'today': {
        const today = new Date().toISOString().split('T')[0]
        const { results } = await db
          .prepare(`SELECT * FROM bookings WHERE booking_date = ? ORDER BY booking_time`)
          .all<Booking>(today)

        const stats = {
          total: results.length,
          confirmed: results.filter((b) => b.status === 'confirmed').length,
          completed: results.filter((b) => b.status === 'completed').length,
          noShow: results.filter((b) => b.status === 'no-show').length,
          revenue: results
            .filter((b) => b.status === 'completed' || b.status === 'confirmed')
            .reduce((sum, b) => sum + b.service_price, 0),
        }

        return NextResponse.json({ bookings: results, stats })
      }

      case 'stats': {
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const { results } = await db
          .prepare(`SELECT * FROM bookings WHERE booking_date LIKE ? AND status != 'cancelled'`)
          .all<Booking>(`${month}%`)

        return NextResponse.json({
          total: results.length,
          revenue: results.reduce((sum, b) => sum + b.service_price, 0),
          completed: results.filter((b) => b.status === 'completed').length,
          noShows: results.filter((b) => b.status === 'no-show').length,
          byService: Object.entries(
            results.reduce((acc: Record<string, number>, b) => {
              acc[b.service_name] = (acc[b.service_name] || 0) + 1
              return acc
            }, {})
          ).sort((a, b) => b[1] - a[1]),
        })
      }

      case 'customers': {
        const { results } = await db
          .prepare(`SELECT
              customer_email,
              customer_name,
              customer_phone,
              COUNT(*) as visit_count,
              MAX(booking_date) as last_visit,
              SUM(service_price) as total_spent
            FROM bookings
            WHERE status != 'cancelled'
            GROUP BY customer_email
            ORDER BY visit_count DESC`)
          .all()
        return NextResponse.json(results)
      }

      case 'blocks': {
        const { results } = await db
          .prepare('SELECT * FROM blocked_times ORDER BY date, start_time')
          .all<BlockedTime>()
        return NextResponse.json(results)
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Admin query failed' }, { status: 500 })
  }
}

// POST /api/admin — add walk-in, add block, etc.
export async function POST(req: NextRequest) {
  const db = getDB()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'block') {
      const { staff_id, date, day_of_week, start_time, end_time, reason, recurring } = body
      const result = await db
        .prepare(`INSERT INTO blocked_times (staff_id, date, day_of_week, start_time, end_time, reason, recurring)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`)
        .first(staff_id || null, date || null, day_of_week || null, start_time, end_time, reason || null, recurring ? 1 : 0)
      return NextResponse.json(result, { status: 201 })
    }

    if (action === 'walkin') {
      const { customer_name, customer_phone, customer_email, service_id, staff_id, booking_date, booking_time, notes } = body
      const service = await db.prepare('SELECT * FROM services WHERE id = ?')
        .first<{ id: number; name: string; price: number; duration: number }>(service_id)
      if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

      let staffName = null
      if (staff_id) {
        const staff = await db.prepare('SELECT name FROM staff WHERE id = ?').first<{ name: string }>(staff_id)
        staffName = staff?.name || null
      }

      const result = await db
        .prepare(`INSERT INTO bookings
          (customer_name, customer_phone, customer_email, service_id, service_name, service_price, service_duration, staff_id, staff_name, booking_date, booking_time, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?) RETURNING *`)
        .first(customer_name, customer_phone || '', customer_email || '', service.id, service.name, service.price, service.duration, staff_id || null, staffName, booking_date, booking_time, notes || null)
      return NextResponse.json(result, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Admin action failed' }, { status: 500 })
  }
}

// DELETE /api/admin?action=block&id=X
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const id = searchParams.get('id')
  const db = getDB()

  try {
    if (action === 'block') {
      await db.prepare('DELETE FROM blocked_times WHERE id = ?').run(id)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
