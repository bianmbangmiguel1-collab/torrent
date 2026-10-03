// app/products/page.tsx
import { getDB } from '@/lib/db';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import ProductsFilterBar from '@/components/products/ProductsFilterBar';

// ─── Types ─────────────────────────────────────────────────────────
interface Product {
  id: number;
  title: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  main_image: string | null;
  avg_rating: number;
  review_count: number;
  sales_count: number;
  featured: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

// ─── Pagination ─────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 20;

// ─── Algorithme de rotation (fallback) ────────────────────────────
function getRotationSeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const a = [...array];
  let m = a.length;
  let t, i;
  if (seed === 0) return a;
  function mulberry32(a: number) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }
  const rand = mulberry32(seed);
  while (m) {
    i = Math.floor(rand() * m--);
    t = a[m];
    a[m] = a[i];
    a[i] = t;
  }
  return a;
}

// ─── Fonction de scoring ──────────────────────────────────────────
interface ProductScore {
  productId: number;
  score: number;
}

// Récupère l'ID utilisateur depuis le token JWT (simplifié)
async function getUserIdFromToken(token: string): Promise<number | null> {
  try {
    // Pour un JWT standard, on peut décoder le payload sans vérification
    // Dans un vrai projet, on validerait la signature avec une clé secrète
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

// Calcule un score personnalisé pour chaque produit pour un utilisateur donné
async function computeProductScores(
  userId: number | null,
  products: Product[]
): Promise<Map<number, number>> {
  const db = await getDB();
  const scoreMap = new Map<number, number>();

  if (!userId) {
    // Non connecté : score = popularité (ventes) + bonus nouveauté
    products.forEach(p => {
      let score = (p.sales_count || 0) * 0.8;
      // Bonus nouveauté (produit de moins de 7 jours)
      const daysSinceCreation = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        score += 5 * 0.2;
      }
      scoreMap.set(p.id, score);
    });
    return scoreMap;
  }

  // ── Utilisateur connecté : scoring avancé ──

  // 1. Favoris
  const favRows = await db.all<{ product_id: number }>(
    `SELECT product_id FROM user_favorites WHERE user_id = ?`,
    [userId]
  );
  const favoriteIds = new Set(favRows.map(r => r.product_id));

  // 2. Achats (produits déjà commandés)
  const orderRows = await db.all<{ product_id: number }>(
    `SELECT DISTINCT oi.product_id 
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?`,
    [userId]
  );
  const purchasedIds = new Set(orderRows.map(r => r.product_id));

  // 3. Vues récentes (derniers 30 jours)
  const viewRows = await db.all<{ product_id: number; count: number }>(
    `SELECT product_id, COUNT(*) as count 
     FROM user_product_views 
     WHERE user_id = ? AND viewed_at > datetime('now', '-30 days')
     GROUP BY product_id`,
    [userId]
  );
  const viewCounts = new Map(viewRows.map(v => [v.product_id, v.count]));

  // 4. Affinité par catégorie (nombre de vues/achats par catégorie)
  const catAffinity = new Map<number, number>();
  const catRows = await db.all<{ category_id: number; total: number }>(
    `SELECT 
       p.category_id,
       COUNT(*) as total
     FROM (
       SELECT product_id FROM user_product_views WHERE user_id = ?
       UNION ALL
       SELECT product_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ?
     ) AS interactions
     JOIN products p ON interactions.product_id = p.id
     GROUP BY p.category_id`,
    [userId, userId]
  );
  catRows.forEach(row => {
    if (row.category_id) catAffinity.set(row.category_id, row.total);
  });

  // ── Calcul du score pour chaque produit ──
  for (const p of products) {
    let score = 0;

    // Popularité globale (ventes) – 30%
    score += (p.sales_count || 0) * 0.3;

    // Affinité catégorie – 25%
    if (p.category_id && catAffinity.has(p.category_id)) {
      score += catAffinity.get(p.category_id)! * 0.25;
    }

    // Historique de navigation (vues) – 20%
    const viewCount = viewCounts.get(p.id) || 0;
    score += viewCount * 0.2;

    // Favoris – 15%
    if (favoriteIds.has(p.id)) {
      score += 10 * 0.15;
    }

    // Nouveauté – 10% (bonus pour les produits récents)
    const daysSinceCreation = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) {
      score += 5 * 0.1;
    }

    // Bonus si l'utilisateur a déjà acheté dans la même catégorie (amorce)
    if (p.category_id && purchasedIds.size > 0) {
      // On compte le nombre de produits achetés dans cette catégorie
      const countInCat = await db.get<{ count: number }>(
        `SELECT COUNT(DISTINCT oi.product_id) as count
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p2 ON oi.product_id = p2.id
         WHERE o.user_id = ? AND p2.category_id = ?`,
        [userId, p.category_id]
      );
      if (countInCat && countInCat.count > 0) {
        score += 10 * countInCat.count;
      }
    }

    scoreMap.set(p.id, score);
  }

  return scoreMap;
}

// ─── Métadonnées ────────────────────────────────────────────────────
export const metadata = {
  title: 'Catalogue des produits | TorrentTwist',
  description: 'Tous nos produits numériques : ebooks, formations, logiciels, etc.',
};

// ─── Page ──────────────────────────────────────────────────────────
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const db = await getDB();

  // ── Récupérer l'utilisateur connecté ──
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  let userId: number | null = null;
  if (token) {
    userId = await getUserIdFromToken(token);
  }

  // ── Lire les paramètres ──
  const page = Math.max(1, Number(searchParams.page) || 1);
  const category = (searchParams.category as string) || 'all';
  const search = (searchParams.search as string) || '';
  const sort = (searchParams.sort as string) || 'default';
  const promo = searchParams.promo === 'true';
  const minPrice = Number(searchParams.minPrice) || 0;
  const maxPrice = Number(searchParams.maxPrice) || 50000;

  const offset = (page - 1) * ITEMS_PER_PAGE;

  // ── Construire la requête ──
  let whereClauses: string[] = ["p.status = 'published'"];
  const params: any[] = [];

  // Catégorie
  if (category !== 'all') {
    const cat = await db.get<Category>(
      'SELECT id FROM categories WHERE slug = ?',
      [category]
    );
    if (cat) {
      whereClauses.push('p.category_id = ?');
      params.push(cat.id);
    } else {
      notFound();
    }
  }

  // Recherche
  if (search) {
    whereClauses.push(
      `(p.title LIKE ? OR p.description LIKE ? OR EXISTS (
        SELECT 1 FROM tags t
        JOIN product_tags pt ON pt.tag_id = t.id
        WHERE pt.product_id = p.id AND t.name LIKE ?
      ))`
    );
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Promo
  if (promo) {
    whereClauses.push('p.compare_price IS NOT NULL AND p.compare_price > p.price');
  }

  // Prix
  whereClauses.push('p.price >= ? AND p.price <= ?');
  params.push(minPrice, maxPrice);

  const whereClause = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // ── Tri ──
  // Si le tri est 'default' et que l'utilisateur est connecté, on utilise le scoring personnalisé
  // Sinon, on utilise le tri classique
  let orderBy: string;
  let useScoring = false;

  if (sort === 'default' && userId) {
    useScoring = true;
    orderBy = ''; // sera ignoré, on triera après
  } else {
    const sortMap: Record<string, string> = {
      default: 'p.created_at DESC',
      newest: 'p.created_at DESC',
      popular: 'sales_count DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      rating: 'avg_rating DESC NULLS LAST',
      promo_desc: '((p.compare_price - p.price) / p.compare_price) DESC NULLS LAST',
    };
    orderBy = sortMap[sort] || sortMap.default;
  }

  // ── Récupérer les produits ──
  let productsQuery = `
    SELECT
      p.id,
      p.title,
      p.slug,
      p.price,
      p.compare_price as oldPrice,
      p.description,
      p.category_id,
      c.name as category_name,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count,
      p.featured,
      p.created_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
  `;

  if (!useScoring) {
    productsQuery += ` ORDER BY ${orderBy}`;
  }

  productsQuery += ` LIMIT ? OFFSET ?`;

  const products: Product[] = await db.all(productsQuery, [...params, ITEMS_PER_PAGE, offset]);

  // ── Compter le total ──
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    ${whereClause}
  `;
  const countRow = await db.get<{ total: number } | undefined>(countQuery, params);
  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // ── Appliquer le scoring personnalisé si nécessaire ──
  let sortedProducts = products;
  if (useScoring) {
    const scoreMap = await computeProductScores(userId, products);
    sortedProducts = [...products].sort((a, b) => {
      const scoreA = scoreMap.get(a.id) || 0;
      const scoreB = scoreMap.get(b.id) || 0;
      return scoreB - scoreA;
    });
  } else {
    // Si le tri est 'default' mais que l'utilisateur n'est pas connecté, on applique la rotation
    if (sort === 'default') {
      const seed = getRotationSeed() + page;
      sortedProducts = shuffleArray(products, seed);
    } else {
      sortedProducts = products; // déjà trié par la requête
    }
  }

  // ── Récupérer les catégories pour les filtres ──
  const categories = await db.all<Category>(`
    SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY name
  `);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Catalogue des produits</h1>
          <p className="text-gray-600">Découvrez notre sélection de produits numériques premium</p>
        </div>

        {/* Barre de filtres interactive (client component) */}
        <ProductsFilterBar
          initialSearch={search}
          initialSort={sort}
          categories={categories}
          currentCategory={category}
          promoActive={promo}
        />

        {/* Résultats */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-lg">Aucun produit ne correspond à vos critères.</p>
            <Link
              href="/products"
              className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Réinitialiser les filtres
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedProducts.map((product) => {
                const discount = product.oldPrice && product.oldPrice > product.price
                  ? Math.round((1 - product.price / product.oldPrice) * 100)
                  : 0;

                const imageUrl = product.main_image || '/images/fallback-product.jpg';

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden h-full">
                      <div className="aspect-square relative bg-gray-100 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {discount > 0 && (
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                            -{discount}%
                          </span>
                        )}
                        {product.sales_count > 100 && (
                          <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                            Best-seller
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-800 text-sm line-clamp-1 group-hover:text-blue-600 transition">
                          {product.title}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-600">
                            {product.avg_rating ? product.avg_rating.toFixed(1) : '0'}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({product.sales_count || 0} ventes)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-bold text-gray-900">
                            {product.price.toLocaleString()} FCFA
                          </span>
                          {product.oldPrice && product.oldPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through">
                              {product.oldPrice.toLocaleString()} FCFA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Link
                  href={`/products?page=${Math.max(1, page - 1)}&category=${category}&search=${search}&sort=${sort}&promo=${promo}`}
                  className={`px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium transition ${
                    page <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-100'
                  }`}
                >
                  Précédent
                </Link>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <Link
                        key={p}
                        href={`/products?page=${p}&category=${category}&search=${search}&sort=${sort}&promo=${promo}`}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                          p === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                </div>

                <Link
                  href={`/products?page=${Math.min(totalPages, page + 1)}&category=${category}&search=${search}&sort=${sort}&promo=${promo}`}
                  className={`px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium transition ${
                    page >= totalPages ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-100'
                  }`}
                >
                  Suivant
                </Link>
              </div>
            )}

            <p className="text-center text-sm text-gray-400 mt-4">
              Affichage de {sortedProducts.length} produit{sortedProducts.length > 1 ? 's' : ''} sur {total} total
            </p>
          </>
        )}
      </div>
    </div>
  );
}