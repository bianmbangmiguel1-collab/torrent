export const dynamic = 'force-dynamic';

// app/api/webhooks/leekpay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { auditLog, AuditAction } from '@/lib/security/audit-log';
import { verifyHmacSignature } from '@/lib/security/encryption';
import { checkRateLimit } from '@/lib/security/rate-limit';
import crypto from 'crypto';

// ⭐ Vérifier la signature HMAC-SHA256 du webhook
function verifyWebhookSignature(
  payload: string,
  signature: string,
  publicKey: string
): boolean {
  return verifyHmacSignature(payload, signature, publicKey);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // ⭐ Rate limiting spécifique pour les webhooks (plus permissif)
    const rateLimitResult = await checkRateLimit(ip, '/api/webhooks/leekpay', {
      limit: 500,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      await auditLog(AuditAction.RATE_LIMIT_EXCEEDED, {
        ip,
        path: '/api/webhooks/leekpay',
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      });
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    // ⭐ Récupérer les headers de sécurité
    const signature = request.headers.get('x-leekpay-signature');
    const event = request.headers.get('x-leekpay-event');
    const delivery = request.headers.get('x-leekpay-delivery');

    if (!signature || !event || !delivery) {
      await auditLog(AuditAction.WEBHOOK_INVALID_SIGNATURE, {
        ip,
        reason: 'Missing security headers',
        headers: Object.fromEntries(request.headers),
      });
      return NextResponse.json({ error: 'Headers de sécurité manquants' }, { status: 401 });
    }

    // ⭐ Lire le payload brut (pour la signature)
    const rawBody = await request.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      await auditLog(AuditAction.WEBHOOK_INVALID_SIGNATURE, {
        ip,
        reason: 'Invalid JSON payload',
      });
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }

    // ⭐ Vérifier la signature avec la clé publique
    const publicKey = process.env.LEEKPAY_PUBLIC_KEY || '';
    if (!publicKey) {
      console.error('❌ Clé publique LeekPay non configurée');
      return NextResponse.json({ error: 'Configuration invalide' }, { status: 500 });
    }

    if (!verifyWebhookSignature(rawBody, signature, publicKey)) {
      await auditLog(AuditAction.WEBHOOK_INVALID_SIGNATURE, {
        ip,
        event,
        delivery,
        signatureProvided: signature,
      });
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    // ⭐ Vérifier l'idempotence (éviter les doublons)
    const db = await getDB();
    
    const existing = await db.get(
      `SELECT id, processed FROM webhooks WHERE delivery_id = ?`,
      [delivery]
    );

    if (existing) {
      if (existing.processed === 1) {
        await auditLog(AuditAction.WEBHOOK_ALREADY_PROCESSED, {
          delivery,
          event,
          existingId: existing.id,
        });
        return NextResponse.json({ success: true, message: 'Already processed' });
      }
    }

    // ⭐ Traiter l'événement
    const { data } = payload;
    const { transaction_id, checkout_id, amount, currency, status, payment_method, customer, paid_at, metadata } = data;

    // ⭐ Vérifier la transaction en base
    const transaction = await db.get(
      `SELECT * FROM payments WHERE checkout_id = ?`,
      [checkout_id]
    );

    if (!transaction) {
      await auditLog(AuditAction.WEBHOOK_TRANSACTION_NOT_FOUND, {
        checkout_id,
        transaction_id,
        event,
      });
      return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 });
    }

    // ⭐ Vérifier le montant (anti-fraude)
    if (amount !== undefined && amount !== transaction.amount) {
      await auditLog(AuditAction.WEBHOOK_AMOUNT_MISMATCH, {
        checkout_id,
        expected: transaction.amount,
        received: amount,
        currency,
        transaction_id,
      });
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    // ⭐ Vérifier la devise
    if (currency && currency !== transaction.currency) {
      await auditLog(AuditAction.WEBHOOK_AMOUNT_MISMATCH, {
        checkout_id,
        expected: transaction.currency,
        received: currency,
        transaction_id,
      });
      return NextResponse.json({ error: 'Devise invalide' }, { status: 400 });
    }

    // ⭐ Mapper le statut LeekPay → statut interne
    const statusMap: Record<string, string> = {
      'paid': 'success',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'expired',
    };

    const newStatus = statusMap[status] || transaction.status;

    // ⭐ Si le statut a changé
    if (newStatus !== transaction.status) {
      // ⭐ Mettre à jour la transaction
      await db.run(
        `UPDATE payments 
         SET status = ?, 
             provider_status = ?,
             provider_transaction_id = ?,
             paid_at = ?,
             payment_method = ?,
             customer_data = ?,
             updated_at = datetime('now') 
         WHERE id = ?`,
        [
          newStatus,
          status,
          transaction_id || null,
          paid_at || null,
          payment_method || null,
          JSON.stringify(customer || {}),
          transaction.id,
        ]
      );

      // ⭐ Enregistrer l'événement
      await db.run(
        `INSERT INTO payment_events (
          payment_id,
          event_type,
          event_id,
          delivery_id,
          status,
          payload_hash,
          processed,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
        [
          transaction.id,
          event,
          transaction_id || checkout_id,
          delivery,
          status,
          crypto.createHash('sha256').update(rawBody).digest('hex'),
        ]
      );

      // ⭐ Si paiement réussi, mettre à jour la commande
      if (newStatus === 'success' && transaction.order_id) {
        await db.run(
          `UPDATE orders
           SET status = ?,
               paid_at = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
          [
            'completed',
            paid_at || null,
            transaction.order_id,
          ]
        );

        await auditLog(AuditAction.ORDER_COMPLETED, {
          orderId: transaction.order_id,
          paymentId: transaction.id,
          newStatus,
        });
      }

    }

    // ⭐ Journaliser et répondre
    await auditLog(AuditAction.WEBHOOK_PROCESSED, {
      delivery: delivery || null,
      event,
      transactionId: transaction?.id || null,
      newStatus,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    try {
      await auditLog(AuditAction.WEBHOOK_PROCESSED, {
        error: String(err),
      });
    } catch (auditErr) {
      console.error('❌ Failed to write audit log:', auditErr);
    }
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }

}