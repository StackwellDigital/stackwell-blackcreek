import type { NextRequest } from 'next/server'

export const runtime = 'edge'

interface Env {
  ADMIN_PASSWORD: string
}

export async function GET(req: NextRequest) {
  const env = process.env as Env
  
  return Response.json({
    hasPassword: !!env.ADMIN_PASSWORD,
    length: env.ADMIN_PASSWORD?.length || 0,
    firstChar: env.ADMIN_PASSWORD?.[0] || 'none',
    lastChar: env.ADMIN_PASSWORD?.[env.ADMIN_PASSWORD.length - 1] || 'none',
    // Shows structure without revealing password
  })
}