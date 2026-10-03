export const dynamic = 'force-dynamic';

// app/api/orders/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const transaction = searchParams.get('transaction');
  const orderId = searchParams.get('order_id');

  if (!transaction && !orderId) {
    return NextResponse.json({ error: 'Paramètre manquant' }, { status: 400 });
  }

  const db = await getDB();

  let order = null;
  if (transaction) {
    order = await db.get(
      `SELECT o.*, p.title as product_title 
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.transaction_id = ?`,
      [transaction]
    );
  } else if (orderId) {
    order = await db.get(
      `SELECT o.*, p.title as product_title 
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.id = ?`,
      [orderId]
    );
  }

  if (!order) {
    return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
  }

  // Récupérer le lien de téléchargement si payé
  let download_url = null;
  if (order.payment_status === 'paid' || order.status === 'completed') {
    // Générer un token de téléchargement (si vous en avez un)
    const token = await db.get(
      `SELECT token FROM download_tokens WHERE order_id = ?`,
      [order.id]
    );
    if (token) {
      download_url = `/api/download/${token.token}`;
    } else {
      // Fallback : créer un token
      // ... logique de création de token
    }
  }

  return NextResponse.json({
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total,
      product_title: order.product_title,
      download_url: download_url
    }
  });
}