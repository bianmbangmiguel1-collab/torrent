// app/admin/categories/page.tsx
import { getDB } from '@/lib/db'
import Link from 'next/link'
import CategoryTable from '../admin/categories/components/CategoryTable'

export const metadata = {
  title: 'Gestion des catégories | TorrentTwist Admin',
}

export default async function AdminCategoriesPage() {
  const db = await getDB()

  // ============================================================
  // STATISTIQUES GLOBALES
  // ============================================================

  const totalCategories = await db.get(`
    SELECT COUNT(*) as count
    FROM categories
  `)

  const activeCategories = await db.get(`
    SELECT COUNT(*) as count
    FROM categories
    WHERE is_active = 1
  `)

  const totalProducts = await db.get(`
    SELECT COUNT(*) as count
    FROM products
  `)

  // ============================================================
  // CATÉGORIES AVEC STATISTIQUES (product_count + children_count)
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

      -- Nom de la catégorie parente
      p.name AS parent_name,

      -- Nombre de produits dans cette catégorie
      (
        SELECT COUNT(*)
        FROM products pr
        WHERE pr.category_id = c.id
      ) AS product_count,

      -- Nombre de sous-catégories
      (
        SELECT COUNT(*)
        FROM categories child
        WHERE child.parent_id = c.id
      ) AS children_count

    FROM categories c

    LEFT JOIN categories p
      ON c.parent_id = p.id

    ORDER BY
      c.position ASC,
      c.name ASC
  `)

  // ============================================================
  // AFFICHAGE
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des catégories
            </h1>

            <p className="text-gray-600 mt-1">
              Organisez vos produits et contrôlez la structure de votre catalogue.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              Tableau de bord
            </Link>

            <Link
              href="/admin/categories/new"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
            >
              + Nouvelle catégorie
            </Link>

          </div>
        </div>

        {/* ======================================================
            STATISTIQUES
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          {/* Total catégories */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Total catégories
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {totalCategories?.count ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              catégories enregistrées
            </p>

          </div>

          {/* Catégories actives */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Catégories actives
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {activeCategories?.count ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              actuellement visibles
            </p>

          </div>

          {/* Total produits */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">

            <p className="text-sm font-medium text-gray-500">
              Produits
            </p>

            <p className="text-3xl font-bold text-blue-600 mt-2">
              {totalProducts?.count ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              produits dans le catalogue
            </p>

          </div>

        </div>

        {/* ======================================================
            TABLEAU DES CATÉGORIES
        ====================================================== */}

        <CategoryTable categories={categories} />

      </div>
    </div>
  )
}