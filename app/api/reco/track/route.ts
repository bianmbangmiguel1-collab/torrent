// app/api/reco/track/route.ts

import { cookies } from 'next/headers'
import { getDB } from '@/lib/db'

interface RecoTrackBody {
  productId: number | string
  eventType: string
  section?: string
  position?: number | string
}

export async function POST(req: Request) {
  const { productId, eventType, section, position } =
    (await req.json()) as RecoTrackBody

  const db = await getDB()
  const visitorId = cookies().get('visitor_id')?.value ?? 'anon'

  await db.run(
    `INSERT INTO product_events (visitor_id, product_id, event_type, metadata)
     VALUES (?, ?, ?, ?)`,
    [visitorId, productId, eventType, JSON.stringify({ section, position })],
  )

  return Response.json({ ok: true })
}