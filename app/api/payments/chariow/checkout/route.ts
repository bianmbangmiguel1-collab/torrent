// app/api/payments/chariow/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { createChariowCheckout, getChariowConfigInfo } from '@/lib/chariow'

export const dynamic = 'force-dynamic'

// ============================================================
// TYPES
// ============================================================

interface ChariowCheckoutBody {
  orderId: number | string
  phone: string
  countryCode?: string
}

// ============================================================
// POST — Créer un checkout Chariow pour une commande existante
// Body : { orderId: number, phone: string, countryCode?: string }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = (await request.json()) as ChariowCheckoutBody
    const { orderId, phone, countryCode } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    const db = await getDB()

    // 1. Récupérer la commande
    const order = await db.get(
      `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, user.id]
    )

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cette commande est déjà payée' },
        { status: 400 }
      )
    }

    // 2. Récupérer le produit (pour avoir le chariow_product_id)
    const product = order.product_id
      ? await db.get(`SELECT * FROM products WHERE id = ?`, [order.product_id])
      : null

    if (!product) {
      return NextResponse.json(
        { error: 'Produit introuvable pour cette commande' },
        { status: 404 }
      )
    }

    // 3. Le product_id Chariow doit être stocké dans le produit
    //    Ajoute une colonne `chariow_product_id` dans products (voir migration ci-dessous)
    const chariowProductId =
      (product as any).chariow_product_id || product.sku || null

    if (!chariowProductId) {
      return NextResponse.json(
        {
          error:
            'Ce produit n\'a pas de chariow_product_id configuré. Contactez l\'admin.',
        },
        { status: 400 }
      )
    }

    // 4. Récupérer l'IP client
    const forwardedFor = request.headers.get('x-forwarded-for')
    const customerIp =
      forwardedFor?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      undefined

    // 5. Splitter le nom en first/last
    const fullName = (user.name || 'Client').trim().split(' ')
    const firstName = fullName[0] || 'Client'
    const lastName = fullName.slice(1).join(' ') || 'TorrentTwist'

    // 6. Construire l'URL de redirection
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUrl = `${appUrl}/payment/success?provider=chariow&orderId=${orderId}`

    // 7. Appeler Chariow
    const result = await createChariowCheckout({
      productId: chariowProductId,
      email: user.email || '',
      firstName,
      lastName,
      phone,
      countryCode: countryCode || 'CM',
      redirectUrl,
      paymentCurrency: (order.currency as string) || 'XOF',
      customMetadata: {
        source: 'torrenttwist',
        order_ref: `ORDER-${orderId}`,
        order_id: String(orderId),
        order_number: String(order.order_number || ''),
        user_id: String(user.id),
        product_id: String(order.product_id || ''),
      },
      customerIp,
    })

    // 8. Sauvegarder dans la commande
    await db.run(
      `UPDATE orders
       SET payment_method = 'chariow',
           payment_id = ?,
           transaction_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        result.purchase?.id || null,
        result.payment?.transaction_id || null,
        orderId,
      ]
    )

    // 9. Log dans payment_logs (best-effort)
    try {
      await db.run(
        `INSERT INTO payment_logs (user_id, order_id, amount, method, status, reference, metadata)
         VALUES (?, ?, ?, 'chariow', 'pending', ?, ?)`,
        [
          user.id,
          orderId,
          Math.round(order.total),
          result.purchase?.id || null,
          JSON.stringify({
            checkout_url: result.payment?.checkout_url,
            transaction_id: result.payment?.transaction_id,
            step: result.step,
          }),
        ]
      )
    } catch (e) {
      console.warn('⚠️ payment_logs insert:', e)
    }

    // 10. Réponse
    return NextResponse.json({
      success: true,
      step: result.step,
      purchase: result.purchase,
      payment: result.payment,
      checkoutUrl: result.payment?.checkout_url || null,
      alreadyPurchased: result.step === 'already_purchased',
    })
  } catch (error) {
    console.error('❌ POST /api/payments/chariow/checkout:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur Chariow',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// GET — Diagnostic
// ============================================================

export async function GET() {
  return NextResponse.json({
    provider: 'chariow',
    ...getChariowConfigInfo(),
  })
}