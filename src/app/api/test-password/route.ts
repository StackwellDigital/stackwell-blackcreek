import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const pw = process.env.ADMIN_PASSWORD || 'NOT_SET'
  
  return Response.json({
    exists: !!process.env.ADMIN_PASSWORD,
    length: pw.length,
    first3: pw.substring(0, 3),
    last3: pw.substring(pw.length - 3),
  })
}