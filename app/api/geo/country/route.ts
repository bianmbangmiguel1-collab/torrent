// app/api/geo/country/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const country =
    req.headers.get('x-vercel-ip-country') ||  // Vercel
    req.headers.get('cf-ipcountry') ||         // Cloudflare
    req.headers.get('x-country') ||            // Custom
    ''

  return NextResponse.json({ country })
}