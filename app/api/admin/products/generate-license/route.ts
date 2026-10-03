// app/api/admin/products/generate-license/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// ============================================================
// Types
// ============================================================
interface GenerateLicenseBody {
  productId: number | string
  userId: number | string
  quantity?: number
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDB()
    const { productId, userId, quantity } =
      (await request.json()) as GenerateLicenseBody

    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    const licenses = []
    const validityDays = product.license_validity_days || 365
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validityDays)

    for (let i = 0; i < (quantity || 1); i++) {
      const code = generateLicenseCode()
      const result = await db.run(`
        INSERT INTO licenses (product_id, user_id, code, expires_at, status)
        VALUES (?, ?, ?, ?, 'active')
      `, [productId, userId, code, expiresAt.toISOString()])

      licenses.push({
        id: result.lastID,
        code,
        expires_at: expiresAt.toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      licenses,
      message: `${licenses.length} licence(s) générée(s) avec succès`
    })
  } catch (error) {
    console.error('Erreur génération licences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des licences' },
      { status: 500 }
    )
  }
}

function generateLicenseCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = []
  for (let i = 0; i < 4; i++) {
    let segment = ''
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  return segments.join('-')
}