import { NextRequest, NextResponse } from 'next/server'
import { getEnv } from '@/lib/db'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const env = getEnv()

  if (password !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', `sw_${env.ADMIN_PASSWORD}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_session')
  return res
}
