// app/admin/categories/page.tsx
import { getDB } from '@/lib/db'
import CategoryTable from './components/CategoryTable'
import Link from 'next/link'

export const metadata = {
  title: 'Gestion des catégories | TorrentTwist Admin',
}

export default async function AdminCategoriesPage() {
  const db = await getDB()

  // ============================================================
  // STATISTIQUES GLOBALES
  // ============================================================

  const totalCategories = await db.get(`
    SELECT COUNT(*) AS total
    FROM categories
  `)

  const activeCategories = await db.get(`
    SELECT COUNT(*) AS total
    FROM categories
    WHERE is_active = 1
  `)

  const totalProducts = await db.get(`
    SELECT COUNT(*) AS total
    FROM products
  `)

  // ============================================================
  // CATÉGORIES (avec produits et sous-catégories)
  // ============================================================

  const categories = await db.all(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.parent_id,
      c.description,
      c.position,
      c.is_active,
      c.created_at,
      p.name AS parent_name,
      (
        SELECT COUNT(*)
        FROM products pr
        WHERE pr.category_id = c.id
      ) AS product_count,
      (
        SELECT COUNT(*)
        FROM categories sub
        WHERE sub.parent_id = c.id
      ) AS children_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY c.position ASC, c.name ASC
  `)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* =====================================================
            HEADER : Titre + Boutons
        ====================================================== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des catégories
            </h1>
            <p className="text-gray-600 mt-1">
              Organisez les produits de votre marketplace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition shadow-sm"
            >
              Tableau de bord
            </Link>
            <Link
              href="/admin/categories/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm"
            >
              + Nouvelle catégorie
            </Link>
          </div>
        </div>

        {/* =====================================================
            STATISTIQUES
        ====================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {/* Total catégories */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total catégories</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {totalCategories?.total ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                📁
              </div>
            </div>
          </div>

          {/* Catégories actives */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Catégories actives</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {activeCategories?.total ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">
                ✓
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Produits</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {totalProducts?.total ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                🛍️
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            TABLEAU DES CATÉGORIES
        ====================================================== */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Toutes les catégories
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gérez la structure de votre catalogue.
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {categories.length} catégorie{categories.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <CategoryTable categories={categories} />
        </div>

      </div>
    </div>
  )
}