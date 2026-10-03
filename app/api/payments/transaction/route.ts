export const dynamic = 'force-dynamic';

// app/api/payments/transaction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractToken, verifyToken, getUserId } from '@/lib/auth';

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'live';
const FEDAPAY_API_URL = FEDAPAY_ENVIRONMENT === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

interface FedaPayTransactionResponse {
  'v1/transaction'?: {
    status?: string
  }
  data?: {
    status?: string
  }
  status?: string
}

export async function GET(req: NextRequest) {
  try {
    const transactionId = req.nextUrl.searchParams.get('transactionId');
    if (!transactionId) {
      return NextResponse.json({ error: 'ID de transaction requis' }, { status: 400 });
    }

    // 1. Authentification
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const userId = getUserId(decoded);
    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
    }

    const db = await getDB();

    // 2. Récupérer la commande
    let order = await db.get(
      `SELECT o.*, u.email as user_email, u.name as user_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.transaction_id = ? AND o.user_id = ?`,
      [transactionId, userId]
    );

    // 3. Si la commande n'est pas encore marquée comme payée, interroger FedaPay
    if (order && order.payment_status !== 'paid') {
      console.log(`🔄 Vérification du statut de la transaction ${transactionId} auprès de FedaPay...`);
      
      try {
        const fedapayResponse = await fetch(`${FEDAPAY_API_URL}/transactions/${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (fedapayResponse.ok) {
          const rawData = (await fedapayResponse.json()) as FedaPayTransactionResponse
          const transactionData =
            rawData['v1/transaction'] || rawData.data || rawData
          const fedapayStatus = transactionData?.status;

          console.log(`📊 Statut FedaPay: ${fedapayStatus}`);

          // Si la transaction est approuvée/paid, mettre à jour la commande
          if (fedapayStatus === 'approved' || fedapayStatus === 'paid') {
            console.log(`✅ Transaction approuvée, mise à jour de la commande ${order.id}`);
            
            // Générer le token de téléchargement
            const crypto = require('crypto');
            const downloadToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            await db.run(
              `UPDATE orders 
               SET status = 'completed', 
                   payment_status = 'paid',
                   paid_at = ?,
                   download_token = ?,
                   download_expires_at = ?,
                   updated_at = ?
               WHERE id = ?`,
              [
                new Date().toISOString(),
                downloadToken,
                expiresAt.toISOString(),
                new Date().toISOString(),
                order.id
              ]
            );

            // Ajouter à la bibliothèque
            if (order.user_id) {
              const products = JSON.parse(order.products || '[]');
              for (const item of products) {
                await db.run(
                  `INSERT OR IGNORE INTO library (user_id, product_id, order_id, access_status, created_at)
                   VALUES (?, ?, ?, 'active', ?)`,
                  [order.user_id, item.product_id, order.id, new Date().toISOString()]
                );
              }
            }

            // Créer une notification
            await db.run(
              `INSERT INTO notifications (user_id, type, title, message, link, icon, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                order.user_id,
                'payment',
                '💳 Paiement réussi',
                `Votre commande ${order.order_number} a été payée avec succès. Vous pouvez maintenant télécharger votre produit.`,
                `/dashboard/library`,
                '🎉',
                new Date().toISOString()
              ]
            );

            // Recharger la commande
            order = await db.get(
              `SELECT o.*, u.email as user_email, u.name as user_name
               FROM orders o
               LEFT JOIN users u ON o.user_id = u.id
               WHERE o.id = ?`,
              [order.id]
            );
          }
        } else {
          console.log(`⚠️ Impossible de vérifier le statut FedaPay: ${fedapayResponse.status}`);
        }
      } catch (fetchError) {
        console.error('❌ Erreur lors de la vérification FedaPay:', fetchError);
        // On continue sans bloquer
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // 4. Construire la réponse
    let downloadUrl = null;
    let isPaid = order.payment_status === 'paid';

    if (isPaid && order.download_token && order.download_expires_at) {
      const now = new Date();
      const expiresAt = new Date(order.download_expires_at);
      if (now < expiresAt) {
        downloadUrl = `/api/download?token=${order.download_token}`;
      }
    }

    const responseData = {
      success: true,
      status: isPaid ? 'approved' : 'pending',
      orderId: order.id,
      orderNumber: order.order_number,
      productTitle: order.product_title,
      downloadToken: order.download_token,
      downloadUrl: downloadUrl,
      isPaid: isPaid,
      message: isPaid ? 'Paiement confirmé' : 'En attente de confirmation',
    };

    console.log(`📤 Réponse: statut=${responseData.status}, downloadUrl=${downloadUrl ? '✅' : '❌'}`);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('❌ Erreur GET /api/payments/transaction:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erreur serveur',
        success: false 
      },
      { status: 500 }
    );
  }
}