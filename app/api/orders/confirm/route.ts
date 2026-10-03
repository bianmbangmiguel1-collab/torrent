// app/api/orders/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface ConfirmOrderBody {
  transactionId: number | string;
  status?: string;
}

interface ProductLine {
  product_id: number | string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    const { transactionId, status } = (await req.json()) as ConfirmOrderBody;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'ID de transaction requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    const order = await db.get(
      'SELECT * FROM orders WHERE transaction_id = ?',
      [transactionId]
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    await db.run(
      `UPDATE orders 
       SET status = ?, 
           payment_status = 'paid',
           paid_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [status || 'completed', new Date().toISOString(), new Date().toISOString(), order.id]
    );

    const products: ProductLine[] = JSON.parse(order.products);
    for (const item of products) {
      await db.run(
        'UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number
    });

  } catch (error: any) {
    console.error('❌ Erreur confirmation commande:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}