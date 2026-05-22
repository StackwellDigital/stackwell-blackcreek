// src/app/api/admin/services/route.ts
import { getDB } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface Service {
  id: number
  name: string
  duration: number   // actual column name in schema
  price: number      // cents
  active: number     // actual column name in schema — 0 | 1
  sort_order: number
}

// GET — list all services
export async function GET(_req: NextRequest) {
  const env = process.env as unknown as Env
  const db = getDB(env)

  const { results } = await db
    .prepare('SELECT * FROM services ORDER BY sort_order ASC, id ASC')
    .all<Service>()

  return NextResponse.json({ services: results })
}

// POST — create new service
export async function POST(req: NextRequest) {
  const env = process.env as unknown as Env
  const db = getDB(env)
  const body = await req.json() as {
    name: string
    duration: number
    price_dollars: number
  }

  if (!body.name || !body.duration || body.price_dollars === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const priceCents = Math.round(body.price_dollars * 100)

  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as sort_order FROM services')
    .first<{ sort_order: number }>()
  const nextSort = (row?.sort_order ?? 0) + 1

  await db
    .prepare(`
      INSERT INTO services (name, duration, price, active, sort_order)
      VALUES (?, ?, ?, 1, ?)
    `)
    .bind(body.name, body.duration, priceCents, nextSort)
    .run()

  return NextResponse.json({ success: true })
}

// PATCH — update service
export async function PATCH(req: NextRequest) {
  const env = process.env as unknown as Env
  const db = getDB(env)
  const body = await req.json() as {
    id: number
    name?: string
    duration?: number
    price_dollars?: number
    active?: boolean
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const existing = await db
    .prepare('SELECT * FROM services WHERE id = ?')
    .bind(body.id)
    .first<Service>()

  if (!existing) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const name = body.name ?? existing.name
  const duration = body.duration ?? existing.duration
  const price = body.price_dollars !== undefined
    ? Math.round(body.price_dollars * 100)
    : existing.price
  const active = body.active !== undefined
    ? (body.active ? 1 : 0)
    : existing.active

  await db
    .prepare(`
      UPDATE services
      SET name = ?, duration = ?, price = ?, active = ?
      WHERE id = ?
    `)
    .bind(name, duration, price, active, body.id)
    .run()

  return NextResponse.json({ success: true })
}

// DELETE — remove service (only if no future bookings)
export async function DELETE(req: NextRequest) {
  const env = process.env as unknown as Env
  const db = getDB(env)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Safety check — don't delete if future confirmed bookings exist
  const future = await db
    .prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE service_id = ? AND status = 'confirmed'
      AND booking_date >= date('now')
    `)
    .bind(id)
    .first<{ count: number }>()

  if ((future?.count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete — active future bookings exist. Deactivate it instead.' },
      { status: 409 }
    )
  }

  await db.prepare('DELETE FROM services WHERE id = ?').bind(id).run()
  return NextResponse.json({ success: true })
}
