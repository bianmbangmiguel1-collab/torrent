// app/product/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  ShoppingCart,
  Zap,
  ShieldCheck,
  Download,
  Star,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Clock,
  BadgeCheck,
  Users,
  TrendingUp,
  Award,
  Crown,
  MessageCircle,
} from 'lucide-react';
import { getDB, recordProductView } from '@/lib/db';
// ⭐ IMPORTS DES COMPOSANTS CLIENT
import ReviewFormWrapper from '@/components/reviews/ReviewFormWrapper';
import ReviewsList from '@/components/reviews/ReviewsList';

// Interface produit
interface Product {
  id: number;
  title: string;
  slug: string;
  price: number;
  compare_price: number | null;
  description: string | null;
  category_id: number | null;
  image_url: string | null;
  image_alt: string | null;
  category_name: string | null;
}

// ─── Récupération du produit ──────────────────────────────────────
async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const db = await getDB();
    const query = `
      SELECT
        p.id,
        p.title,
        p.slug,
        p.price,
        p.compare_price,
        p.description,
        p.category_id,
        c.name AS category_name,
        pi.url AS image_url,
        pi.alt AS image_alt
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = 1
      WHERE p.slug = ?
        AND p.status = 'published'
      LIMIT 1
    `;
    const product = await db.get<Product>(query, [slug]);
    return product || null;
  } catch (error) {
    console.error('❌ Erreur getProductBySlug :', error);
    return null;
  }
}

// ─── Récupération de l'ID utilisateur depuis le token ────────────
async function getUserIdFromToken(token: string): Promise<number | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.id || payload.sub || null;
  } catch {
    return null;
  }
}

// ─── Métadonnées SEO ──────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return { title: 'Produit non trouvé | TorrentTwist' };
  }
  return {
    title: `${product.title} | TorrentTwist`,
    description:
      product.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
      `Découvrez ${product.title} sur TorrentTwist`,
    openGraph: {
      title: product.title,
      description: product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || '',
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

// ─── Page produit ──────────────────────────────────────────────────
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  // ─── Récupération de l'utilisateur pour les vues ────────────────
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  let userId: number | null = null;
  if (token) {
    userId = await getUserIdFromToken(token);
  }
  if (userId) {
    recordProductView(userId, product.id).catch((err) =>
      console.error('Erreur enregistrement vue produit :', err)
    );
  }

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  const imageUrl = product.image_url || '/images/fallback-product.PNG';

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* Dégradé d'arrière-plan */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute top-40 -right-40 h-96 w-96 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* ========== FIL D'ARIANE ========== */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500 flex-wrap">
          <Link href="/" className="transition hover:text-blue-600">Accueil</Link>
          <span>/</span>
          <Link href="/products" className="transition hover:text-blue-600">Produits</Link>
          {product.category_name && (
            <>
              <span>/</span>
              <span className="text-slate-600">{product.category_name}</span>
            </>
          )}
          <span>/</span>
          <span className="max-w-[220px] truncate font-medium text-slate-900">{product.title}</span>
        </nav>

        {/* ========== HERO ========== */}
        <section className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* ===== IMAGE ===== */}
          <div className="relative">
            {discount > 0 && (
              <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                <Sparkles className="h-4 w-4" />
                -{discount}% DE RÉDUCTION
              </div>
            )}

            <div className="relative aspect-square overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
              <Image
                src={imageUrl}
                alt={product.image_alt || product.title}
                fill
                priority
                className="object-cover transition duration-700 hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/60 to-transparent p-6 pt-20">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <BadgeCheck className="h-5 w-5 text-blue-300" />
                  Produit numérique vérifié
                </div>
              </div>
            </div>

            {/* Mini indicateurs */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <Download className="mx-auto mb-2 h-5 w-5 text-blue-600" />
                <p className="text-xs font-semibold text-slate-700">Téléchargement</p>
                <p className="mt-1 text-xs text-slate-400">Instantané</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
                <p className="text-xs font-semibold text-slate-700">Paiement</p>
                <p className="mt-1 text-xs text-slate-400">Sécurisé</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <Clock className="mx-auto mb-2 h-5 w-5 text-violet-500" />
                <p className="text-xs font-semibold text-slate-700">Accès</p>
                <p className="mt-1 text-xs text-slate-400">Immédiat</p>
              </div>
            </div>
          </div>

          {/* ===== DÉTAILS ===== */}
          <div className="flex flex-col justify-center">
            {product.category_name && (
              <div className="mb-4">
                <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-600">
                  {product.category_name}
                </span>
              </div>
            )}

            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {product.title}
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-500">Produit digital premium</span>
            </div>

            {/* Description courte */}
            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-base leading-7 text-slate-600">
                {product.description
                  ?.replace(/<[^>]*>/g, '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 280)}
                {product.description && product.description.replace(/<[^>]*>/g, '').length > 280 && '...'}
              </p>
            </div>

            {/* Prix */}
            <div className="mt-7">
              <div className="flex flex-wrap items-end gap-4">
                <span className="text-4xl font-black text-blue-600 sm:text-5xl">
                  {product.price.toLocaleString('fr-FR')} FCFA
                </span>
                {product.compare_price && product.compare_price > product.price && (
                  <span className="pb-1 text-xl font-medium text-slate-400 line-through">
                    {product.compare_price.toLocaleString('fr-FR')} FCFA
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="mt-2 text-sm font-semibold text-emerald-600">
                  Vous économisez{' '}
                  {(product.compare_price! - product.price).toLocaleString('fr-FR')} FCFA
                </p>
              )}
            </div>

            {/* Boutons */}
            <div className="mt-8 space-y-3">
              <button className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl">
                <ShoppingCart className="h-5 w-5 transition group-hover:scale-110" />
                Ajouter au panier
              </button>
              <button className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-blue-600 bg-white px-6 py-4 text-base font-bold text-blue-600 transition duration-300 hover:bg-blue-50">
                <Zap className="h-5 w-5 fill-current transition group-hover:scale-110" />
                Acheter maintenant
              </button>
            </div>

            {/* Trust */}
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Paiement sécurisé</p>
                  <p className="text-xs text-slate-400">Vos transactions sont protégées</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Livraison instantanée</p>
                  <p className="text-xs text-slate-400">Accédez immédiatement au produit</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== DESCRIPTION COMPLÈTE ========== */}
        <section className="mt-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
              <div className="mb-8">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
                  <Sparkles className="h-4 w-4" />
                  À propos du produit
                </span>
                <h2 className="text-3xl font-black text-slate-950">
                  Découvrez ce que vous allez obtenir
                </h2>
              </div>

              {product.description && (
                <div
                  className="
                    product-description
                    text-base
                    leading-8
                    text-slate-600
                    [&_p]:mb-5
                    [&_strong]:font-bold
                    [&_strong]:text-slate-900
                    [&_ul]:my-6
                    [&_ul]:space-y-3
                    [&_li]:relative
                    [&_li]:rounded-xl
                    [&_li]:border
                    [&_li]:border-slate-100
                    [&_li]:bg-slate-50
                    [&_li]:px-5
                    [&_li]:py-4
                    [&_li]:pl-12
                    [&_li]:before:absolute
                    [&_li]:before:left-4
                    [&_li]:before:top-1/2
                    [&_li]:before:flex
                    [&_li]:before:h-6
                    [&_li]:before:w-6
                    [&_li]:before:-translate-y-1/2
                    [&_li]:before:items-center
                    [&_li]:before:justify-center
                    [&_li]:before:rounded-full
                    [&_li]:before:bg-emerald-100
                    [&_li]:before:text-emerald-600
                    [&_li]:before:content-['✓']
                  "
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Accès immédiat</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Après votre achat, votre produit numérique sera disponible immédiatement.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-lg font-bold text-slate-900">Pourquoi TorrentTwist ?</h3>
                <div className="space-y-4">
                  {[
                    'Produits numériques accessibles rapidement',
                    'Paiement sécurisé',
                    'Accès après validation de la commande',
                    'Support client disponible',
                  ].map((text) => (
                    <div key={text} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-600">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ═══ ⭐ SECTION D'APPEL À L'ACTION IRRÉSISTIBLE ═══ */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-center text-white shadow-2xl">
            <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] opacity-10" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold text-white/90 mb-6">
                <Users className="w-4 h-4" />
                <span>Rejoignez la communauté TorrentTwist</span>
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                🚀 Vous avez aimé ce produit ?
              </h2>

              <p className="mt-4 text-xl text-white/90 max-w-2xl mx-auto">
                <span className="font-bold text-yellow-300">Donnez votre avis</span> et devenez un{' '}
                <span className="font-bold text-amber-300">membre vedette</span> de notre communauté !
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition">
                  <Crown className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Devenez un<br />Membre Vedette</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition">
                  <Award className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Gagnez des<br />Badges d'Excellence</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition">
                  <MessageCircle className="w-8 h-8 text-pink-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Partagez votre<br />Expérience Unique</p>
                </div>
              </div>

              <div className="mt-8 max-w-2xl mx-auto">
                <p className="text-lg text-white/80 italic">
                  "Chaque avis que vous partagez fait grandir notre communauté et aide
                  d'autres personnes comme vous à faire le bon choix. ✨"
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="#review-form"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-2xl shadow-lg shadow-yellow-400/30 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <MessageCircle className="w-5 h-5" />
                  ✍️ Donner mon avis maintenant
                  <span className="text-sm bg-slate-800/20 px-2 py-0.5 rounded-full">+ badge</span>
                </Link>

                <Link
                  href="#reviews"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/30 transition hover:-translate-y-1"
                >
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  Voir les avis des membres
                </Link>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>+1 234 membres actifs</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span>+5 678 avis partagés</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-300" />
                  <span>234 membres vedettes</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-white/40">
                Votre avis compte ! Rejoignez les meilleurs contributeurs de la plateforme. 🌟
              </p>
            </div>
          </div>
        </section>

        {/* ========== ⭐ SECTION AVIS CLIENTS COMPLÈTE ========== */}
        <section id="reviews" className="mt-16 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Colonne gauche : affichage des avis */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                Avis clients
              </h2>

              {/* ⭐ Liste des avis (composant client) */}
              <ReviewsList productSlug={product.slug} />
            </div>

            {/* ⭐ Colonne droite : formulaire d'avis (composant client) */}
            <div id="review-form">
              <ReviewFormWrapper productSlug={product.slug} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}