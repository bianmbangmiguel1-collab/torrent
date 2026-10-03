// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractToken, verifyToken, getUserId } from '@/lib/auth';

interface VerifyPaymentBody {
  transactionId?: string | number;
  status?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authentification
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    const userId = getUserId(decoded);

    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non identifié' },
        { status: 401 }
      );
    }

    // Body de la requête
    const body: VerifyPaymentBody = await req.json();

    const { transactionId, status } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Récupérer la commande par transaction_id
    const order = await db.get(
      `SELECT * FROM orders WHERE transaction_id = ? AND user_id = ?`,
      [String(transactionId), Number(userId)]
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Si le statut est approved, mettre à jour la commande
    if (status === 'approved' && order.payment_status !== 'paid') {
      await db.run(
        `UPDATE orders 
         SET payment_status = 'paid', 
             status = 'completed', 
             updated_at = datetime('now') 
         WHERE id = ?`,
        [order.id]
      );

      console.log(
        `✅ Commande ${order.id} marquée comme payée via vérification`
      );

      // Générer un token de téléchargement
      const downloadToken = require('crypto')
        .randomBytes(32)
        .toString('hex');

      await db.run(
        `UPDATE orders SET download_token = ? WHERE id = ?`,
        [downloadToken, order.id]
      );

      console.log(
        `✅ Token de téléchargement généré pour la commande ${order.id}`
      );

      // Ajouter à la bibliothèque
      await db.run(
        `INSERT OR IGNORE INTO library
          (user_id, product_id, order_id, access_status, created_at)
         VALUES (?, ?, ?, 'active', datetime('now'))`,
        [order.user_id, order.product_id, order.id]
      );

      // Créer une notification
      await db.run(
        `INSERT INTO notifications
          (user_id, type, title, message, link, created_at)
         VALUES (
           ?,
           'success',
           'Paiement confirmé',
           'Votre paiement pour "${order.product_title}" a été confirmé. Vous pouvez maintenant télécharger votre produit.',
           '/account/orders',
           datetime('now')
         )`,
        [order.user_id]
      );
    }

    // Retourner la commande mise à jour
    const updatedOrder = await db.get(
      `SELECT * FROM orders WHERE id = ?`,
      [order.id]
    );

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });

  } catch (error: unknown) {
    console.error('❌ Erreur vérification paiement:', error);

    const message =
      error instanceof Error ? error.message : 'Erreur interne';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}