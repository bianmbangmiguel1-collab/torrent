// app/api/users/library/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

async function getUserId(request: NextRequest): Promise<number | null> {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7)
  }

  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    const rawId = (payload as any).id || (payload as any).userId || (payload as any).sub
    const userId = parseInt(String(rawId), 10)
    return Number.isNaN(userId) ? null : userId
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = parseInt(searchParams.get('order_id') || '', 10)
    const productId = parseInt(searchParams.get('product_id') || '', 10)

    if (!orderId || Number.isNaN(orderId) || !productId || Number.isNaN(productId)) {
      return NextResponse.json({ error: 'order_id et product_id requis' }, { status: 400 })
    }

    const db = await getDB()

    // Vérifier que la commande appartient à l'utilisateur et est payée
    const order = await db.get(
      `SELECT * FROM orders WHERE id = ? AND user_id = ? AND payment_status = 'paid'`,
      [orderId, userId]
    )
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable ou non payée' }, { status: 404 })
    }

    // Vérifier la limite de téléchargement
    const limit = order.download_limit || 0
    const count = order.download_count || 0
    if (limit > 0 && count >= limit) {
      return NextResponse.json(
        { error: 'Limite de téléchargements atteinte' },
        { status: 429 }
      )
    }

    // Vérifier l'expiration
    if (order.download_expires_at && new Date(order.download_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien de téléchargement expiré' }, { status: 410 })
    }

    // Récupérer le produit
    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId])
    if (!product || !product.file_path) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    // Chemin du fichier
    const filePath = path.join(process.cwd(), 'public', product.file_path.replace(/^\//, ''))

    try {
      const stat = await fs.stat(filePath)
      const buffer = await fs.readFile(filePath)
      const filename = path.basename(filePath)

      // Incrémenter le compteur
      await db.run(
        'UPDATE orders SET download_count = download_count + 1, updated_at = datetime("now") WHERE id = ?',
        [orderId]
      )

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': String(stat.size),
          'Cache-Control': 'no-store',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable sur le serveur' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('❌ Erreur download:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'