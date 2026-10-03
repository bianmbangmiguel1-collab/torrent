// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist-super-secret-key-2024';

interface CheckoutRequestBody {
  productId: number | string
  quantity?: number
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Vérification de la session...');
    
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    console.log('🔍 Token présent:', token ? 'Oui' : 'Non');

    if (!token) {
      console.log('❌ Aucun token trouvé dans les cookies');
      return NextResponse.json(
        { error: 'Vous devez être connecté pour passer commande' },
        { status: 401 }
      );
    }

    // Vérifier le token avec jose
    let decoded: any;
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      decoded = payload;
      console.log('✅ Token vérifié:', decoded);
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      return NextResponse.json(
        { error: 'Session invalide - Token non valide' },
        { status: 401 }
      );
    }

    // Récupérer l'userId
    const userId = decoded.userId || decoded.id || decoded.sub;
    
    if (!userId) {
      console.log('❌ userId manquant dans le token');
      return NextResponse.json(
        { error: 'Session invalide - userId manquant' },
        { status: 401 }
      );
    }

    console.log('👤 Utilisateur ID:', userId, 'Email:', decoded.email);

    const body = (await request.json()) as CheckoutRequestBody;
    const { productId, quantity = 1 } = body;

    console.log('📦 Produit ID:', productId, 'Quantité:', quantity);

    if (!productId) {
      return NextResponse.json(
        { error: 'ID du produit requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Récupérer le produit
    const product = await db.get(
      `SELECT id, title, price, slug 
       FROM products 
       WHERE id = ? AND status = 'published'`,
      [productId]
    );

    if (!product) {
      console.log('❌ Produit non trouvé:', productId);
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    console.log('📦 Produit trouvé:', product.title, product.price, 'FCFA');

    // Vérifier que l'utilisateur existe
    const user = await db.get(
      'SELECT id, email, name FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      console.log('❌ Utilisateur non trouvé:', userId);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Créer la commande - le prix vient du serveur, pas du client !
    const total = product.price * quantity;
    const orderNumber = `TT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    console.log('📝 Création de la commande:', orderNumber, 'Total:', total, 'FCFA');

    const orderResult = await db.run(
      `INSERT INTO orders 
       (orderNumber, user_id, subtotal, total, currency, status, payment_status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 'XOF', 'pending', 'pending', datetime('now'), datetime('now'))`,
      [orderNumber, userId, total, total]
    );

    const orderId = orderResult.lastID;

    // Ajouter les articles de la commande
    await db.run(
      `INSERT INTO order_items 
       (order_id, product_id, quantity, price, total, product_title, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [orderId, productId, quantity, product.price, total, product.title]
    );

    console.log('✅ Commande créée avec succès:', { orderId, orderNumber });

    // Créer un enregistrement de paiement en attente
    await db.run(
      `INSERT INTO payments 
       (order_id, user_id, amount, currency_code, amount_converted, method, status, created_at, updated_at) 
       VALUES (?, ?, ?, 'XOF', ?, 'leekpay', 'pending', datetime('now'), datetime('now'))`,
      [orderId, userId, total, total]
    );

    // Pour le test, simuler un paiement réussi
    // Plus tard, ce sera remplacé par l'appel à LeekPay
    await db.run(
      `UPDATE orders 
       SET status = 'paid', 
           payment_status = 'paid',
           updated_at = datetime('now') 
       WHERE id = ?`,
      [orderId]
    );

    // Ajouter le produit à la bibliothèque de l'utilisateur
    await db.run(
      `INSERT OR REPLACE INTO library 
       (user_id, product_id, order_id, access_status, created_at) 
       VALUES (?, ?, ?, 'active', datetime('now'))`,
      [userId, productId, orderId]
    );

    // Créer un token de téléchargement
    const downloadToken = generateDownloadToken();
    await db.run(
      `INSERT INTO download_tokens 
       (token, order_id, product_id, user_id, expires_at, max_downloads, created_at) 
       VALUES (?, ?, ?, ?, datetime('now', '+30 days'), 5, datetime('now'))`,
      [downloadToken, orderId, productId, userId]
    );

    console.log('✅ Produit ajouté à la bibliothèque et token créé');

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      total: total,
      currency: 'XOF',
      message: 'Commande créée avec succès !',
      // Pour le test, on redirige directement vers la page de succès
      // Plus tard, ce sera la redirection vers LeekPay
      redirectUrl: `/checkout/success?orderId=${orderId}`,
    });

  } catch (error: any) {
    console.error('❌ Erreur checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de la commande' },
      { status: 500 }
    );
  }
}

// Fonction pour générer un token de téléchargement
function generateDownloadToken(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';