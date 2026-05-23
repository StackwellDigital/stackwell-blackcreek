import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'experimental-edge'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  // Allow login page/API through
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next()
  }

  const auth = req.cookies.get('admin_session')?.value

  if (auth === 'sw_authed') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/admin/login', req.url))
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}