// app/category/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

// Import explicite depuis le fichier de données
import {
  getCategoryBySlug,
  getCategoriesByParent,
  type Category,
} from '@/app/data/categoriesData';

interface Product {
  id: number;
  title: string;
  slug: string;
  price: number;
  image?: string | null;
  category_id: number;
  description?: string;
}

interface ProductsApiResponse {
  products?: Product[];
  error?: string;
  message?: string;
}

// Simuler une récupération de produits (remplacez par votre vraie logique)
async function getProductsByCategory(categoryId: number): Promise<Product[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/products?categoryId=${categoryId}`, {
      cache: 'force-cache',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ProductsApiResponse;
    return data.products || [];
  } catch {
    // Fallback mock
    return [
      { id: 1, title: 'Exemple 1', slug: 'exemple-1', price: 19.99, category_id: categoryId, image: null },
      { id: 2, title: 'Exemple 2', slug: 'exemple-2', price: 29.99, category_id: categoryId, image: null },
    ];
  }
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
        <div className="aspect-square relative bg-gray-100 flex items-center justify-center">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <span className="text-4xl text-gray-300">📦</span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition line-clamp-1">
            {product.title}
          </h3>
          <p className="text-lg font-bold text-blue-600 mt-1">
            {product.price.toFixed(2)} FCFA
          </p>
        </div>
      </div>
    </Link>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = getCategoryBySlug(params.slug);
  if (!category) {
    return { title: 'Catégorie non trouvée' };
  }
  return {
    title: `${category.name} - TorrentTwist`,
    description: category.description || `Découvrez tous les produits de la catégorie ${category.name}`,
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Récupérer la catégorie
  const category = getCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  // Produits et sous‑catégories
  const products = await getProductsByCategory(category.id);
  const subCategories = getCategoriesByParent(category.id);

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* En-tête */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-lg text-gray-600 max-w-2xl">{category.description}</p>
        )}
        <nav className="text-sm text-gray-500 mt-4" aria-label="Fil d'Ariane">
          <ol className="flex items-center space-x-2">
            <li><Link href="/" className="hover:text-blue-600">Accueil</Link></li>
            <li><span className="mx-1">/</span></li>
            <li><Link href="/categories" className="hover:text-blue-600">Catégories</Link></li>
            <li><span className="mx-1">/</span></li>
            <li className="text-gray-700 font-medium">{category.name}</li>
          </ol>
        </nav>
      </div>

      {/* Sous‑catégories */}
      {subCategories.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sous-catégories</h2>
          <div className="flex flex-wrap gap-3">
            {subCategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${sub.slug}`}
                className="px-4 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-full text-sm transition"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Liste des produits */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Produits ({products.length})
          </h2>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <span className="text-5xl block mb-4">🛒</span>
            <p className="text-gray-500">Aucun produit dans cette catégorie pour le moment.</p>
            <p className="text-sm text-gray-400 mt-2">Revenez plus tard, nous ajoutons régulièrement du contenu.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Génération statique de toutes les pages de catégorie
export async function generateStaticParams() {
  // Réimport des catégories pour éviter les problèmes de référence circulaire
  const { categories } = await import('@/app/data/categoriesData');
  return categories.map((cat) => ({ slug: cat.slug }));
}