// app/api/admin/currencies/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDB()
    const currencies = await db.all(`
      SELECT * FROM currencies ORDER BY is_default DESC, code
    `)

    return NextResponse.json({ currencies })
  } catch (error) {
    console.error('❌ Erreur devises:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devises' },
      { status: 500 }
    )
  }
}