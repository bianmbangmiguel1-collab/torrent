// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// ============================================================
// TYPES
// ============================================================
interface ItemInput {
  productId: number;
  quantity: number;
}

interface CreateOrderBody {
  productId?: number | string;
  quantity?: number;
  userEmail?: string;
  items?: ItemInput[];
}

interface ProductRow {
  id: number;
  title: string;
  price: number;
  stock: number;
  slug: string;
  file_path?: string;
  file_size?: string;
  file_format?: string;
}

// ============================================================
// POST /api/orders/create
// Accepte 2 formats :
//   1. { productId: 1, quantity: 2 }                    → 1 produit
//   2. { items: [{ productId: 1, quantity: 2 }, ...] }  → multi-produits
// ============================================================
export async function POST(req: NextRequest) {
  try {
    // 🔥 1. Authentification
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // 🔥 2. Lire le body et normaliser
    const body = (await req.json()) as CreateOrderBody;
    const { productId, quantity = 1, userEmail, items } = body;

    // ✅ Normalisation : on transforme tout en tableau `items`
    let normalizedItems: ItemInput[] = [];

    if (Array.isArray(items) && items.length > 0) {
      // Format multi-produits
      normalizedItems = items
        .map((it: any) => ({
          productId: parseInt(String(it.productId ?? it.product_id), 10),
          quantity: Math.max(1, parseInt(String(it.quantity ?? 1), 10)),
        }))
        .filter((it) => !isNaN(it.productId) && it.productId > 0);

      console.log(`📦 Format multi-produits : ${normalizedItems.length} article(s)`);
    } else if (productId) {
      // Format simple
      normalizedItems = [
        {
          productId: parseInt(String(productId), 10),
          quantity: Math.max(1, parseInt(String(quantity), 10)),
        },
      ];

      console.log(`📦 Format simple : produit ${productId} × ${quantity}`);
    }

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: 'Aucun produit valide dans la requête' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // 🔥 3. Récupérer les produits et vérifier
    const products: ProductRow[] = [];
    for (const item of normalizedItems) {
      const product = await db.get<ProductRow>(
        'SELECT id, title, price, stock, slug, file_path, file_size, file_format FROM products WHERE id = ? AND status = "published"',
        [item.productId]
      );

      if (!product) {
        return NextResponse.json(
          { error: `Produit introuvable (ID: ${item.productId})` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuffisant pour "${product.title}" (disponible : ${product.stock})` },
          { status: 400 }
        );
      }

      products.push(product);
    }

    // 🔥 4. Calculer le total
    let totalAmount = 0;
    const orderItems = products.map((product, idx) => {
      const item = normalizedItems[idx];
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      return {
        product,
        quantity: item.quantity,
        price: product.price,
        subtotal,
      };
    });

    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();

    // 🔥 5. Construire le titre de la commande
    const productTitles =
      orderItems.length === 1
        ? orderItems[0].product.title
        : `${orderItems[0].product.title} + ${orderItems.length - 1} autre${orderItems.length > 2 ? 's' : ''}`;

    // 🔥 6. Construire le JSON des produits
    const productsJson = JSON.stringify(
      orderItems.map((oi) => ({
        product_id: oi.product.id,
        title: oi.product.title,
        quantity: oi.quantity,
        price: oi.price,
        total: oi.subtotal,
      }))
    );

    // 🔥 7. Le premier produit_id (compatibilité avec la structure single)
    const firstProductId = orderItems[0].product.id;

    // 🔥 8. Créer la commande
    const orderData = {
      order_number: orderNumber,
      user_id: user.id,
      user_email: userEmail || user.email,
      user_name: user.name || user.email,
      product_id: firstProductId, // ⚠️ Legacy : 1er produit
      product_title: productTitles,
      subtotal: totalAmount,
      total: totalAmount,
      amount: totalAmount,
      total_amount: totalAmount, // ⚠️ Colonne legacy
      currency: 'XOF',
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'fedapay',
      products: productsJson,
      created_at: now,
      updated_at: now,
    };

    const columns = Object.keys(orderData).join(', ');
    const placeholders = Object.keys(orderData).map(() => '?').join(', ');
    const values = Object.values(orderData);

    const orderResult = await db.run(
      `INSERT INTO orders (${columns}) VALUES (${placeholders})`,
      values
    );

    const orderId = Number(orderResult.lastID ?? 0);

    console.log(`✅ Commande créée : #${orderId} (${orderNumber})`);
    console.log(`   Total : ${totalAmount} FCFA · ${orderItems.length} article(s)`);

    // 🔥 9. Ajouter TOUS les articles dans order_items
    for (const oi of orderItems) {
      await db.run(
        `INSERT INTO order_items (
          order_id, product_id, quantity, price, total, product_title,
          product_file_path, product_file_size, product_format, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          oi.product.id,
          oi.quantity,
          oi.price,
          oi.subtotal,
          oi.product.title,
          oi.product.file_path || null,
          oi.product.file_size || null,
          oi.product.file_format || null,
          now,
        ]
      );
    }

    // 🔥 10. Retourner le résultat
    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      totalAmount,
      itemCount: orderItems.length,
      items: orderItems.map((oi) => ({
        productId: oi.product.id,
        title: oi.product.title,
        quantity: oi.quantity,
        price: oi.price,
        subtotal: oi.subtotal,
      })),
    });
  } catch (error: any) {
    console.error('❌ Erreur création commande:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';