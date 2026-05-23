import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface Env {
  ADMIN_PASSWORD: string
}

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string }
  const env = process.env as unknown as Env

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