import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import type { Service } from '@/lib/db'

export const runtime = 'edge'

export async function GET() {
  try {
    const db = getDB()
    const { results } = await db
      .prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order')
      .all<Service>()
    return NextResponse.json(results)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 })
  }
}
