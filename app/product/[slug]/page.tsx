// app/product/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  ShoppingCart, Zap, ShieldCheck, Download, Star, CheckCircle2, ArrowLeft,
  Sparkles, Clock, BadgeCheck, Users, TrendingUp, Award, Crown, MessageCircle,
  Heart, Share2, Eye, ThumbsUp, Gift, Rocket, Flame, Gem, Layers, Package,
  Truck, CreditCard, Lock, Headphones, HelpCircle, ChevronRight, ChevronLeft,
  Play, Video, BookOpen, Palette, Code, Music, Camera, PenTool, Coffee,
  Briefcase, Smartphone, Gamepad2, Sun, Moon, Cloud, Zap as ZapIcon, Sparkle,
  Star as StarIcon, Crown as CrownIcon, Medal, Trophy, Diamond, Globe, Compass,
  Feather, Flower, Leaf, Mountain, Waves, Wind, FileText, BookOpenCheck,
  ListChecks, GraduationCap, Library, BookMarked, BookCopy, BookA, BookDashed,
  BookKey, BookText, BookUser, User as UserIcon, Calendar, PenSquare, AtSign,
} from 'lucide-react';
import { getDB, recordProductView } from '@/lib/db';
import { getProductReviews, getProductReviewSummary } from '@/lib/services/reviews';
import { verifyToken } from '@/lib/auth';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import ReviewCard from '@/components/reviews/ReviewCard';
import ReviewFormWrapper from '@/components/reviews/ReviewFormWrapper';

// 🆕 NOUVEAU : bouton unique qui redirige vers /checkout
import ProductBuyButton from '@/components/ProductBuyButton';

// 🆕 COMPOSANTS AMÉLIORÉS
import ProductHero from '@/components/product/ProductHero';
import ValueProposition from '@/components/product/ValueProposition';
import LiveActivityFeed from '@/components/product/LiveActivityFeed';

// 🆕 NOUVEAUX COMPOSANTS
import BackToHomeButton from '@/components/product/BackToHomeButton';
import ReadingProgress from '@/components/product/ReadingProgress';
import ScrollToTopButton from '@/components/product/ScrollToTopButton';
import SkillsProgress from '@/components/product/SkillsProgress';

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
  stock: number;
  sales: number;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  download_url?: string;
  content_preview?: string;
  chapters?: string;
  author?: string;
  created_by?: number;
  updated_by?: number;
  author_name?: string;
  author_email?: string;
  author_avatar?: string;
}

// ─── Récupération du produit ──────────────────────────────────────
async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const db = await getDB();
    const query = `
      SELECT
        p.id, p.title, p.slug, p.price, p.compare_price, p.description,
        p.category_id, p.stock, p.sales, p.avg_rating, p.total_reviews,
        p.created_at,
        c.name AS category_name,
        pi.url AS image_url, pi.alt AS image_alt,
        p.download_url, p.content_preview, p.chapters, p.author,
        p.created_by, p.updated_by,
        u.name AS author_name, u.email AS author_email, u.avatar AS author_avatar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = 1
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.slug = ? AND p.status = 'published'
      LIMIT 1
    `;
    const product = await db.get<Product>(query, [slug]);
    return product || null;
  } catch (error) {
    console.error('❌ Erreur getProductBySlug :', error);
    return null;
  }
}

async function getUserIdFromToken(token: string): Promise<number | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

// ─── Métadonnées SEO ──────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Produit non trouvé | TorrentTwist' };

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
  if (!product) notFound();

  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  let userId: number | null = null;
  if (token) userId = await getUserIdFromToken(token);
  if (userId) {
    recordProductView(userId, product.id).catch((err) =>
      console.error('Erreur enregistrement vue produit :', err)
    );
  }

  const [summary, reviewsData] = await Promise.all([
    getProductReviewSummary(product.id),
    getProductReviews(product.id, 10, 0),
  ]);

  const imageUrl = product.image_url || '/images/fallback-product.PNG';

  // Parsing des chapitres
  let chapters: string[] = [];
  try {
    if (product.chapters) chapters = JSON.parse(product.chapters);
  } catch {
    chapters = [];
  }

  const previewContent: string = product.content_preview || '';
  const hasPreview = previewContent.length > 0 || chapters.length > 0;
  const hasAuthor = !!(product.author || product.author_name);

  // Produits similaires
  const db = await getDB();
  const similarProducts = await db.all(
    `
    SELECT 
      p.id, p.title, p.slug, p.price, p.compare_price, p.avg_rating,
      pi.url as image_url
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = 1
    WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
    ORDER BY p.sales DESC
    LIMIT 4
  `,
    [product.category_id, product.id]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* 🆕 BARRE DE PROGRESSION DE LECTURE */}
      <ReadingProgress />

      {/* BACKGROUND EFFECTS */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute top-40 -right-40 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-200/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* BREADCRUMB + BOUTON RETOUR À L'ACCUEIL */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <nav className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <Link href="/" className="transition hover:text-blue-600">Accueil</Link>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <Link href="/products" className="transition hover:text-blue-600">Produits</Link>
            {product.category_name && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <span className="text-slate-600">{product.category_name}</span>
              </>
            )}
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="max-w-[220px] truncate font-medium text-slate-900">
              {product.title}
            </span>
          </nav>

          <BackToHomeButton />
        </div>

        {/* ============================================================
            HERO AMÉLIORÉ
        ============================================================ */}
        <ProductHero product={product} />

        {/* ============================================================
            🆕 BLOC D'ACHAT PRINCIPAL
            Redirige vers /checkout?orderId=X au clic
        ============================================================ */}
        <section className="mt-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
            {/* Message d'incitation */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm sm:text-base">
                  Prêt à commencer ?
                </p>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Choisissez votre méthode de paiement à l'étape suivante
                  (FedaPay ou Chariow).
                </p>
              </div>
            </div>

            {/* Bouton d'achat + prix */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Prix</p>
                  <p className="text-3xl font-black text-slate-900">
                    {product.price.toLocaleString()}{' '}
                    <span className="text-lg">FCFA</span>
                  </p>
                  {product.compare_price && product.compare_price > product.price && (
                    <p className="text-xs text-slate-400 line-through mt-1">
                      {product.compare_price.toLocaleString()} FCFA
                    </p>
                  )}
                </div>
                {product.stock !== undefined && product.stock > 0 && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    En stock
                  </span>
                )}
              </div>

              <ProductBuyButton
                productId={product.id}
                price={product.price}
                comparePrice={product.compare_price}
                label="Acheter maintenant"
                variant="primary"
              />
            </div>
          </div>
        </section>

        {/* ============================================================
            DESCRIPTION + APERÇU
        ============================================================ */}
        <section className="mt-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[28px] border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-sm sm:p-10">
              <div className="mb-8">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-100">
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
                    product-description text-base leading-8 text-slate-600
                    [&_p]:mb-5 [&_strong]:font-bold [&_strong]:text-slate-900
                    [&_ul]:my-6 [&_ul]:space-y-3
                    [&_li]:relative [&_li]:rounded-xl [&_li]:border [&_li]:border-slate-100
                    [&_li]:bg-slate-50 [&_li]:px-5 [&_li]:py-4 [&_li]:pl-12
                    [&_li]:before:absolute [&_li]:before:left-4 [&_li]:before:top-1/2
                    [&_li]:before:flex [&_li]:before:h-6 [&_li]:before:w-6
                    [&_li]:before:-translate-y-1/2 [&_li]:before:items-center
                    [&_li]:before:justify-center [&_li]:before:rounded-full
                    [&_li]:before:bg-emerald-100 [&_li]:before:text-emerald-600
                    [&_li]:before:content-['✓']
                  "
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              {hasPreview && (
                <div className="mt-10 pt-8 border-t border-slate-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                      <BookOpenCheck className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Aperçu du contenu</h3>
                      <p className="text-sm text-slate-500">
                        Découvrez ce que vous allez apprendre
                      </p>
                    </div>
                  </div>

                  {chapters.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                        <ListChecks className="w-4 h-4 text-blue-500" />
                        Chapitres
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {chapters.map((chapter, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition hover:-translate-y-1"
                          >
                            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
                              {index + 1}
                            </div>
                            <span className="text-sm text-slate-700">{chapter}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewContent && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                        <BookText className="w-4 h-4 text-purple-500" />
                        Extrait
                      </h4>
                      <div
                        className="text-sm text-slate-600 leading-7 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                      />
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        <span>Contenu exclusif disponible après achat</span>
                      </div>
                    </div>
                  )}

                  {hasAuthor && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                        <BookUser className="w-4 h-4 text-blue-600" />
                        À propos de l'auteur
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden">
                          {product.author_avatar ? (
                            <Image
                              src={product.author_avatar}
                              alt={product.author_name || product.author || 'Auteur'}
                              width={56}
                              height={56}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-7 h-7 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {product.author_name || product.author || 'Auteur inconnu'}
                          </p>
                          {product.author_email && (
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <AtSign className="w-3 h-3" />
                              {product.author_email}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Publié le{' '}
                            {new Date(product.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <aside className="space-y-4">
              {hasPreview && (
                <div className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 hover:shadow-xl transition">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <GraduationCap className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Ce que vous apprendrez</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {[
                      'Contenu structuré et clair',
                      'Exemples pratiques',
                      'Accès immédiat après achat',
                      'Format PDF/ebook',
                    ].map((text) => (
                      <li key={text} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 hover:shadow-xl transition">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Accès immédiat</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Après votre achat, votre produit numérique sera disponible immédiatement.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl transition">
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

              {hasAuthor && (
                <div className="rounded-[24px] border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6 hover:shadow-xl transition">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <BookUser className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Auteur</h3>
                  <p className="mt-2 text-sm text-slate-700 font-medium">
                    {product.author_name || product.author || 'Auteur inconnu'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Publié le{' '}
                    {new Date(product.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* ============================================================
            SECTION PROGRESSION DES COMPÉTENCES
        ============================================================ */}
        <SkillsProgress productTitle={product.title} />

        {/* ============================================================
            VISUALISATION
        ============================================================ */}
        <ValueProposition productTitle={product.title} productType="file" />

        {/* ============================================================
            PRODUITS SIMILAIRES
        ============================================================ */}
        {similarProducts.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                Produits similaires
              </h2>
              <Link
                href="/products"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similarProducts.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-200/50 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <Image
                      src={p.image_url || '/images/placeholder.png'}
                      alt={p.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">
                      {p.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-blue-600">
                        {p.price.toLocaleString()} FCFA
                      </span>
                      {p.avg_rating > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {p.avg_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================
            CTA COMMUNAUTÉ
        ============================================================ */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-center text-white shadow-2xl shadow-indigo-500/30">
            <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />

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
                <span className="font-bold text-yellow-300">Donnez votre avis</span> et
                devenez un <span className="font-bold text-amber-300">membre vedette</span> de
                notre communauté !
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {[
                  { icon: CrownIcon, label: 'Devenez un\nMembre Vedette', color: 'yellow' },
                  { icon: Award, label: "Gagnez des\nBadges d'Excellence", color: 'emerald' },
                  { icon: MessageCircle, label: 'Partagez votre\nExpérience', color: 'pink' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition hover:-translate-y-1"
                  >
                    <item.icon className={`w-8 h-8 text-${item.color}-300 mx-auto mb-2`} />
                    <p className="font-semibold text-sm whitespace-pre-line">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="#review-form"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-2xl shadow-lg shadow-yellow-400/30 transition hover:-translate-y-1"
                >
                  <MessageCircle className="w-5 h-5" />
                  ✍️ Donner mon avis
                  <span className="text-sm bg-slate-800/20 px-2 py-0.5 rounded-full">+ badge</span>
                </Link>
                <Link
                  href="#reviews"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/30 transition hover:-translate-y-1"
                >
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  Voir les avis
                </Link>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/70 flex-wrap">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>+1 234 membres actifs</span>
                </div>
                <div className="w-px h-4 bg-white/20 hidden sm:block" />
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span>+5 678 avis partagés</span>
                </div>
                <div className="w-px h-4 bg-white/20 hidden sm:block" />
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-300" />
                  <span>234 membres vedettes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION AVIS
        ============================================================ */}
        <section id="reviews" className="mt-16 pt-8 border-t border-slate-200/50">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                Avis clients
              </h2>

              <ReviewSummary summary={summary} />

              <div className="mt-6 space-y-4">
                {reviewsData.reviews.length > 0 ? (
                  reviewsData.reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} showHelpful={true} />
                  ))
                ) : (
                  <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/50">
                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aucun avis pour le moment</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Soyez le premier à donner votre avis !
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div id="review-form">
              <ReviewFormWrapper productSlug={product.slug} />
            </div>
          </div>
        </section>
      </div>

      {/* FEED ACTIVITÉ EN DIRECT */}
      <LiveActivityFeed productTitle={product.title} />

      {/* BOUTON REMONTER EN HAUT */}
      <ScrollToTopButton />
    </div>
  );
}