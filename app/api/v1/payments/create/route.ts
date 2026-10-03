// app/api/v1/payments/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { fedapay } from '@/lib/fedapay-service';

// ============================================================
// Types
// ============================================================
interface CreatePaymentBody {
  product_id?: number | string;
  quantity?: number;
}

interface DbRunResult {
  lastID?: number;
  changes?: number;
}

async function createPaymentHandler(req: NextRequest) {
  // ... (logique, voir ci-dessous)
}

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const token = req.cookies.get('user_session')?.value;
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

    // 2. Récupérer les données
    const body = await req.json() as CreatePaymentBody;
    const { product_id, quantity = 1 } = body;
    if (!product_id) {
      return NextResponse.json(
        { error: 'ID produit requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // 3. Récupérer le produit
    const product = await db.get(
      'SELECT * FROM products WHERE id = ? AND status = "published"',
      [product_id]
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: 'Stock insuffisant' },
        { status: 400 }
      );
    }

    // 4. Créer la commande en base
    const totalAmount = product.price * quantity;
    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const orderResult = (await db.run(
      `INSERT INTO orders (
        order_number, user_id, subtotal, total, amount, currency,
        status, payment_status, payment_method, products, total_amount,
        user_email, user_name, product_title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        user.id,
        totalAmount,
        totalAmount,
        totalAmount,
        'XOF',
        'pending',
        'pending',
        'fedapay',
        JSON.stringify([{
          product_id: product.id,
          title: product.title,
          quantity: quantity,
          price: product.price,
          total: totalAmount
        }]),
        totalAmount,
        user.email,
        user.name || user.email,
        product.title,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    )) as DbRunResult;

    const orderId = Number(orderResult.lastID ?? 0);

    // 5. Créer la transaction FedaPay
    const transaction = await fedapay.createTransaction({
      amount: totalAmount,
      description: `Achat: ${product.title} - ${orderNumber}`,
      customer: {
        email: user.email,
        firstname: user.name?.split(' ')[0] || '',
        lastname: user.name?.split(' ').slice(1).join(' ') || '',
        phone_number: user.phone ? {
          number: user.phone.replace(/\D/g, ''),
          country: 'CI',
        } : undefined,
      },
      currency: 'XOF',
      callback_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/webhooks/fedapay`,
      custom_metadata: {
        order_id: orderId,
        order_number: orderNumber,
        product_id: product.id,
        product_title: product.title,
      },
    });

    // 6. Mettre à jour la commande avec l'ID transaction
    await db.run(
      'UPDATE orders SET transaction_id = ? WHERE id = ?',
      [transaction.id, orderId]
    );

    // 7. Générer le token de paiement
    const paymentToken = await fedapay.getPaymentToken(transaction.id);

    // 8. Retourner la réponse
    return NextResponse.json({
      success: true,
      orderId: orderId,
      orderNumber: orderNumber,
      transactionId: transaction.id,
      checkout_url: paymentToken.url,
      token: paymentToken.token,
    });

  } catch (error) {
    console.error('❌ Erreur création paiement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}