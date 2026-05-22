// src/app/api/admin/availability/route.ts
import { getDB } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
interface AvailabilityRow {
  id: number
  staff_id: number
  day_of_week: number
  start_time: string // "HH:MM"
  end_time: string   // "HH:MM"
}

const DEFAULT_HOURS = [
  { day_of_week: 0, start_time: null, end_time: null },   // Sun — closed
  { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 6, start_time: null, end_time: null },   // Sat — closed
]

// GET — return all 7 days, filling in defaults for missing rows
export async function GET(_req: NextRequest) {
  
  const db = getDB()

  // Use staff_id = 1 for solo mode
  const { results } = await db
    .prepare('SELECT * FROM availability WHERE staff_id = 1 ORDER BY day_of_week ASC')
    .all<AvailabilityRow>()

  // Merge DB rows with defaults so we always return all 7 days
  const schedule = DEFAULT_HOURS.map(def => {
    const row = results.find(r => r.day_of_week === def.day_of_week)
    return row
      ? { day_of_week: row.day_of_week, start_time: row.start_time, end_time: row.end_time, id: row.id }
      : { day_of_week: def.day_of_week, start_time: def.start_time, end_time: def.end_time, id: null }
  })

  return NextResponse.json({ schedule })
}

// POST — upsert full week schedule
// Body: { schedule: [{ day_of_week, start_time, end_time }] }
// Pass start_time: null / end_time: null for closed days
export async function POST(req: NextRequest) {
  
  const db = getDB()

  const body = await req.json() as {
    schedule: Array<{
      day_of_week: number
      start_time: string | null
      end_time: string | null
    }>
  }

  if (!body.schedule || body.schedule.length !== 7) {
    return NextResponse.json({ error: 'Must provide all 7 days' }, { status: 400 })
  }

  for (const day of body.schedule) {
    const existing = await db
      .prepare('SELECT id FROM availability WHERE staff_id = 1 AND day_of_week = ?')
      .bind(day.day_of_week)
      .first<{ id: number }>()

    if (day.start_time && day.end_time) {
      // Open day — upsert
      if (existing) {
        await db
          .prepare('UPDATE availability SET start_time = ?, end_time = ? WHERE id = ?')
          .bind(day.start_time, day.end_time, existing.id)
          .run()
      } else {
        await db
          .prepare('INSERT INTO availability (staff_id, day_of_week, start_time, end_time) VALUES (1, ?, ?, ?)')
          .bind(day.day_of_week, day.start_time, day.end_time)
          .run()
      }
    } else {
      // Closed day — delete row if exists
      if (existing) {
        await db
          .prepare('DELETE FROM availability WHERE id = ?')
          .bind(existing.id)
          .run()
      }
    }
  }

  return NextResponse.json({ success: true })
}
