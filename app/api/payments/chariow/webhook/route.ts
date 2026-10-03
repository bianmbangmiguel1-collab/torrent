// app/api/payments/chariow/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import crypto from 'crypto'

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.CHARIOW_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  // Le header est au format "sha256=<hex>"
  const prefix = 'sha256='
  if (!signatureHeader.startsWith(prefix)) return false
  const received = signatureHeader.slice(prefix.length)

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-chariow-signature')
    const event = req.headers.get('x-pulse-event') || ''
    const deliveryId = req.headers.get('x-pulse-delivery-id') || ''

    console.log(`📩 Chariow Pulse: ${event} (${deliveryId})`)

    // ─── Vérification de signature (obligatoire en prod) ───
    if (!verifySignature(rawBody, signature)) {
      console.error('❌ Signature Chariow invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    console.log('📦 Payload:', JSON.stringify(payload, null, 2))

    // ─── Idempotence : ignore les réessais ───
    const db = await getDB()
    if (deliveryId) {
      const existing = await db.get(
        `SELECT id FROM webhooks WHERE event_type = ? AND payload LIKE ? LIMIT 1`,
        ['chariow_pulse', `%${deliveryId}%`],
      )
      if (existing) {
        console.log(`⏭️ Livraison ${deliveryId} déjà traitée`)
        return NextResponse.json({ ok: true, skipped: true })
      }
    }

    // ─── Traiter l'événement ───
    if (event === 'successful.sale') {
      const sale = payload.sale || {}
      const orderId =
        sale.custom_metadata?.orderId ||
        payload.sale?.custom_metadata?.orderId

      if (!orderId) {
        console.warn('⚠️ successful.sale sans orderId dans custom_metadata')
        return NextResponse.json({ ok: true, ignored: true })
      }

      await db.run(
        `UPDATE orders
         SET payment_status = 'paid',
             status = 'completed',
             paid_at = datetime('now'),
             transaction_id = ?,
             download_expires_at = datetime('now', '+30 days'),
             download_limit = COALESCE(download_limit, 5),
             updated_at = datetime('now')
         WHERE id = ?`,
        [sale.id || null, orderId],
      )

      console.log(`✅ Commande ${orderId} marquée payée (Chariow)`)

      // Log l'événement pour idempotence
      await db.run(
        `INSERT INTO webhooks (event_type, payload, processed)
         VALUES (?, ?, 1)`,
        ['chariow_pulse', JSON.stringify({ deliveryId, event, saleId: sale.id })],
      )
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('❌ Erreur webhook Chariow:', err)
    return NextResponse.json(
      { error: err.message || 'Erreur interne' },
      { status: 500 },
    )
  }
}