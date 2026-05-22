import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /admin and /api/admin routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  const auth = req.cookies.get('admin_session')?.value
  const adminPassword = (process.env.ADMIN_PASSWORD as string) || ''

  if (auth === `sw_${adminPassword}`) {
    return NextResponse.next()
  }

  // Redirect to login for page routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  // 401 for API routes
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
