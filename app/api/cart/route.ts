export const dynamic = 'force-dynamic';

// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface CartRequestBody {
  productId: number | string
  quantity?: number
}

// ============================================================
// MIGRATION - Ajouter les colonnes manquantes
// ============================================================

async function ensureCartTableColumns(db: any) {
  try {
    // Vérifier si la colonne created_at existe
    const columns = await db.all(`PRAGMA table_info(user_cart)`);
    const columnNames = columns.map((c: any) => c.name);
    
    if (!columnNames.includes('created_at')) {
      await db.exec(`ALTER TABLE user_cart ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Colonne created_at ajoutée à user_cart');
    }
    
    if (!columnNames.includes('updated_at')) {
      await db.exec(`ALTER TABLE user_cart ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Colonne updated_at ajoutée à user_cart');
    }
  } catch (error) {
    console.warn('⚠️ Erreur migration user_cart:', error);
  }
}

// ============================================================
// GET - Récupérer le panier de l'utilisateur
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('user_session')?.value || cookieStore.get('token')?.value;

    if (!token) {
      // Utilisateur invité - récupérer le panier guest
      const sessionId = cookieStore.get('guest_session_id')?.value;
      if (!sessionId) {
        return NextResponse.json({ items: [], totalItems: 0 });
      }

      const db = await getDB();
      
      // Vérifier si la table existe
      const tableExists = await db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='guest_cart_items'`
      );

      if (!tableExists) {
        return NextResponse.json({ items: [], totalItems: 0 });
      }

      const items = await db.all(
        `SELECT 
          g.id,
          g.product_id,
          g.quantity,
          p.title,
          p.price,
          p.compare_price,
          p.slug,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image
         FROM guest_cart_items g
         JOIN products p ON g.product_id = p.id
         WHERE g.session_id = ? AND p.status = 'published'`,
        [sessionId]
      );

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

      return NextResponse.json({ items, totalItems });
    }

    // 🔥 Vérifier le token
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    const db = await getDB();
    
    // 🔥 S'assurer que les colonnes existent
    await ensureCartTableColumns(db);

    // Récupérer le panier de l'utilisateur
    const items = await db.all(
      `SELECT 
        c.id,
        c.product_id,
        c.quantity,
        p.title,
        p.price,
        p.compare_price,
        p.slug,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating
       FROM user_cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ? AND p.status = 'published'`,
      [user.id]
    );

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({
      items,
      totalItems,
      userId: user.id
    });

  } catch (error: any) {
    console.error('❌ Erreur GET cart:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du panier' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Ajouter un produit au panier
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('user_session')?.value || cookieStore.get('token')?.value;

    const body = (await request.json()) as CartRequestBody;
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'ID du produit requis' },
        { status: 400 }
      );
    }

    const db = await getDB();
    
    // 🔥 S'assurer que les colonnes existent
    await ensureCartTableColumns(db);

    // Vérifier que le produit existe
    const product = await db.get(
      'SELECT id, price, title, stock FROM products WHERE id = ? AND status = "published"',
      [productId]
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

    // 🔥 Si utilisateur connecté
    if (token) {
      const user = await verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Token invalide' },
          { status: 401 }
        );
      }

      // Vérifier si le produit est déjà dans le panier
      const existingItem = await db.get(
        'SELECT id, quantity FROM user_cart WHERE user_id = ? AND product_id = ?',
        [user.id, productId]
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          return NextResponse.json(
            { error: 'Stock insuffisant' },
            { status: 400 }
          );
        }
        await db.run(
          'UPDATE user_cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newQuantity, existingItem.id]
        );
      } else {
        await db.run(
          `INSERT INTO user_cart (user_id, product_id, quantity, created_at, updated_at) 
           VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [user.id, productId, quantity]
        );
      }

      // Récupérer le total du panier
      const totalResult = await db.get(
        'SELECT SUM(quantity) as total FROM user_cart WHERE user_id = ?',
        [user.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Produit ajouté au panier',
        totalItems: totalResult?.total || 0,
      });
    }

    // 🔥 Utilisateur invité
    let sessionId = cookieStore.get('guest_session_id')?.value;
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    // Créer la table guest_cart_items si elle n'existe pas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS guest_cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    const existingItem = await db.get(
      'SELECT id, quantity FROM guest_cart_items WHERE session_id = ? AND product_id = ?',
      [sessionId, productId]
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        return NextResponse.json(
          { error: 'Stock insuffisant' },
          { status: 400 }
        );
      }
      await db.run(
        'UPDATE guest_cart_items SET quantity = ? WHERE id = ?',
        [newQuantity, existingItem.id]
      );
    } else {
      await db.run(
        'INSERT INTO guest_cart_items (session_id, product_id, quantity, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [sessionId, productId, quantity]
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Produit ajouté au panier',
      totalItems: 0
    });

    response.cookies.set('guest_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('❌ Erreur POST cart:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'ajout au panier' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - Supprimer un produit du panier
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('user_session')?.value || cookieStore.get('token')?.value;
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'ID du produit requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    if (token) {
      const user = await verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Token invalide' },
          { status: 401 }
        );
      }

      await db.run(
        'DELETE FROM user_cart WHERE user_id = ? AND product_id = ?',
        [user.id, productId]
      );

      return NextResponse.json({
        success: true,
        message: 'Produit retiré du panier'
      });
    }

    // Utilisateur invité
    const sessionId = cookieStore.get('guest_session_id')?.value;
    if (sessionId) {
      await db.run(
        'DELETE FROM guest_cart_items WHERE session_id = ? AND product_id = ?',
        [sessionId, productId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Produit retiré du panier'
    });

  } catch (error: any) {
    console.error('❌ Erreur DELETE cart:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Mettre à jour la quantité
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('user_session')?.value || cookieStore.get('token')?.value;
    const body = (await request.json()) as CartRequestBody;
    const { productId, quantity } = body;

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'ID du produit et quantité requis' },
        { status: 400 }
      );
    }

    if (quantity < 0) {
      return NextResponse.json(
        { error: 'La quantité doit être supérieure à 0' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Vérifier le stock
    const product = await db.get(
      'SELECT stock FROM products WHERE id = ? AND status = "published"',
      [productId]
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    if (quantity > product.stock) {
      return NextResponse.json(
        { error: 'Stock insuffisant' },
        { status: 400 }
      );
    }

    if (token) {
      const user = await verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Token invalide' },
          { status: 401 }
        );
      }

      if (quantity === 0) {
        await db.run(
          'DELETE FROM user_cart WHERE user_id = ? AND product_id = ?',
          [user.id, productId]
        );
      } else {
        await db.run(
          'UPDATE user_cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
          [quantity, user.id, productId]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Panier mis à jour'
      });
    }

    // Utilisateur invité
    const sessionId = cookieStore.get('guest_session_id')?.value;
    if (sessionId) {
      if (quantity === 0) {
        await db.run(
          'DELETE FROM guest_cart_items WHERE session_id = ? AND product_id = ?',
          [sessionId, productId]
        );
      } else {
        await db.run(
          'UPDATE guest_cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?',
          [quantity, sessionId, productId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Panier mis à jour'
    });

  } catch (error: any) {
    console.error('❌ Erreur PUT cart:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}