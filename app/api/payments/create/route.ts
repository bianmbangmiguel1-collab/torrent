// app/api/payments/fedapay/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// 🔥 Configuration FedaPay (serveur uniquement)
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';
const FEDAPAY_API_URL = FEDAPAY_ENVIRONMENT === 'live' 
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

const FEDAPAY_CALLBACK_URL = process.env.FEDAPAY_CALLBACK_URL || 
  `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`;

const FEDAPAY_WEBHOOK_URL = process.env.FEDAPAY_WEBHOOK_URL ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/fedapay/webhook`;

// ============================================================
// Types
// ============================================================
interface CreatePaymentBody {
  orderId?: number;
  productId?: number;
  productTitle?: string;
  amount?: number;
}

interface FedaPayErrorResponse {
  message?: string;
  error?: string;
}

interface FedaPayTransactionResponse {
  id: number;
}

interface FedaPayTokenResponse {
  token: string;
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    // 🔥 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // 🔥 2. Récupérer les données
    const body = (await req.json()) as CreatePaymentBody;
    const { orderId, productId, productTitle, amount } = body;

    if (!orderId || !productId || !amount) {
      return NextResponse.json(
        { error: 'Données manquantes: orderId, productId, amount requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // 🔥 3. Vérifier la commande en base de données
    const order = await db.get(
      `SELECT o.*, u.email as user_email, u.name as user_name 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       WHERE o.id = ?`,
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // 🔥 4. Vérifier que l'utilisateur est bien le propriétaire
    if (order.user_id !== decoded.userId && order.user_email !== decoded.email) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // 🔥 5. Vérifier le produit (prix réel en base)
    const product = await db.get(
      `SELECT id, title, price FROM products WHERE id = ?`,
      [productId]
    );

    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    // 🔥 6. 🔥🔥🔥 CRITIQUE : Ne pas faire confiance au prix envoyé ! 🔥🔥🔥
    // On utilise le prix réel de la base de données
    const realPrice = product.price;
    const realAmount = Math.round(realPrice);
    
    console.log('🔐 Vérification prix:');
    console.log(`   Envoyé par frontend: ${amount} FCFA`);
    console.log(`   Prix réel en base: ${realPrice} FCFA`);
    
    if (Math.abs(amount - realPrice) > 1) {
      console.warn('⚠️ Tentative de manipulation de prix détectée!');
      console.warn(`   Frontend: ${amount} | Base: ${realPrice}`);
      // On peut soit bloquer, soit corriger automatiquement
      // On bloque pour sécurité
      return NextResponse.json(
        { error: 'Montant invalide. Veuillez réessayer.' },
        { status: 400 }
      );
    }

    // 🔥 7. Créer la transaction FedaPay
    console.log('📡 Création transaction FedaPay...');
    
    const transactionData = {
      description: `Paiement ${product.title}`,
      amount: realAmount,
      currency: {
        iso: "XOF"
      },
      callback_url: FEDAPAY_CALLBACK_URL,
      customer: {
        email: order.user_email || decoded.email,
        firstname: order.user_name || decoded.email?.split('@')[0] || 'Client'
      },
      custom_metadata: {
        orderId: order.id,
        orderNumber: order.order_number || `ORD-${order.id}`,
        productId: product.id,
        productTitle: product.title,
        environment: FEDAPAY_ENVIRONMENT
      }
    };

    console.log('📦 Transaction data:', JSON.stringify(transactionData, null, 2));

    // 🔥 8. Appeler l'API FedaPay
    const fedapayResponse = await fetch(`${FEDAPAY_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`
      },
      body: JSON.stringify(transactionData)
    });

    if (!fedapayResponse.ok) {
      const errorData = (await fedapayResponse.json()) as FedaPayErrorResponse;

      console.error('❌ Erreur FedaPay API:', errorData);

      return NextResponse.json(
        {
          error:
            errorData.message ||
            errorData.error ||
            'Erreur lors de la création du paiement'
        },
        { status: fedapayResponse.status }
      );
    }

    const transaction =
      (await fedapayResponse.json()) as FedaPayTransactionResponse;

    console.log('✅ Transaction FedaPay créée:', transaction.id);

    // 🔥 9. Générer le token de paiement
    const tokenResponse = await fetch(`${FEDAPAY_API_URL}/transactions/${transaction.id}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`
      }
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Erreur génération token:', errorData);
      return NextResponse.json(
        { error: 'Erreur lors de la génération du lien de paiement' },
        { status: tokenResponse.status }
      );
    }

    const tokenData =
      (await tokenResponse.json()) as FedaPayTokenResponse;

    console.log('✅ Token généré:', tokenData.token);
    console.log('🔗 URL de paiement:', tokenData.url);

    // 🔥 10. Mettre à jour la commande avec l'ID de transaction
    await db.run(
      `UPDATE orders SET transaction_id = ?, payment_status = 'pending' WHERE id = ?`,
      [transaction.id, order.id]
    );

    // 🔥 11. Retourner l'URL de paiement au frontend
    return NextResponse.json({
      success: true,
      orderId: order.id,
      transactionId: transaction.id,
      paymentUrl: tokenData.url
    });

  } catch (error: unknown) {
    console.error('❌ Erreur création paiement:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Erreur serveur';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}