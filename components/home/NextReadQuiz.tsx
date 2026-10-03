'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];

// Emojis par défaut si la catégorie n'en fournit pas
const CATEGORY_EMOJI: Record<string, string> = {
  Informatique: '💻', Musique: '🎵', Vidéo: '🎬', 'E-books': '📚',
  Shopping: '🛍️', Photographie: '📷', Design: '🎨', Santé: '❤️',
  Café: '☕', Business: '💼', Téléphonie: '📱', Jeux: '🎮',
};

export interface QuizCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}

interface QuizProduct {
  id: number;
  slug: string;
  title: string;
  price: number;
  main_image?: string | null;
}

interface QuizApiResponse {
  products?: QuizProduct[];
  error?: string;
  message?: string;
}

interface Props {
  categories: QuizCategory[];
}

export default function NextReadQuiz({ categories }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [categoryId, setCategoryId] = useState<number>();
  const [categoryName, setCategoryName] = useState<string>('');
  const [products, setProducts] = useState<QuizProduct[]>([]);
  const [loading, setLoading] = useState(false);

  async function run(catId: number, catName: string, level: string) {
    setLoading(true);
    try {
      const r = await fetch('/api/reco/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: catId, level }),
      });
      const data = (await r.json()) as QuizApiResponse;
      setProducts(data.products ?? []);
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  // Pas de catégories → on masque le module
  if (categories.length === 0) return null;

  return (
    <section className="my-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6">

      {/* ───── Titres ───── */}
      <h2 className="text-lg sm:text-xl font-bold !text-black mb-1">
        🤖 Trouvez votre prochaine lecture
      </h2>
      <p className="text-sm !text-black mb-5">
        Deux questions, trois recommandations.
      </p>

      {/* ───── ÉTAPE 1 : catégorie ───── */}
      {step === 0 && (
        <>
          <p className="text-sm font-semibold !text-black mb-2">
            1️⃣ Que recherchez-vous ?
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  setCategoryName(c.name);
                  setStep(1);
                }}
                className="px-4 py-2 rounded-full bg-white !text-black border border-gray-300 hover:border-indigo-500 hover:!text-indigo-600 transition"
              >
                {CATEGORY_EMOJI[c.name] ?? '📦'} {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ───── ÉTAPE 2 : niveau ───── */}
      {step === 1 && (
        <>
          <p className="text-sm font-semibold !text-black mb-2">
            2️⃣ Votre niveau en <span className="font-bold">{categoryName}</span> ?
          </p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => run(categoryId!, categoryName, l)}
                className="px-4 py-2 rounded-full bg-white !text-black border border-gray-300 hover:border-indigo-500 hover:!text-indigo-600 transition"
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setStep(0); setCategoryId(undefined); }}
            className="mt-3 text-xs !text-black hover:!text-indigo-600 underline"
          >
            ← Changer de domaine
          </button>
        </>
      )}

      {/* ───── Chargement ───── */}
      {loading && (
        <p className="text-sm !text-black mt-4">Analyse en cours…</p>
      )}

      {/* ───── ÉTAPE 3 : résultats ───── */}
      {step === 2 && products.length > 0 && (
        <>
          <p className="text-sm font-semibold mt-2 mb-3 !text-black">
            ✨ Nos recommandations pour vous
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {products.map(p => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="block rounded-xl bg-white border border-gray-200 p-3 hover:shadow-md transition"
              >
                {p.main_image && (
                  <div className="relative aspect-[4/3] mb-2 rounded-lg overflow-hidden">
                    <Image
                      src={p.main_image}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                )}
                <p className="text-sm font-medium !text-black line-clamp-2">
                  {p.title}
                </p>
                <p className="text-sm font-bold mt-1 !text-indigo-600">
                  {p.price} €
                </p>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => { setStep(0); setCategoryId(undefined); setProducts([]); }}
              className="text-xs !text-black hover:!text-indigo-600 underline"
            >
              ← Recommencer
            </button>
            <Link
              href={`/products?category=${categories.find(c => c.id === categoryId)?.slug ?? ''}`}
              className="text-sm font-medium !text-indigo-600 hover:underline"
            >
              Voir toute la catégorie →
            </Link>
          </div>
        </>
      )}

      {/* ───── Aucun résultat ───── */}
      {step === 2 && products.length === 0 && !loading && (
        <>
          <p className="text-sm !text-black">
            Aucun produit ne correspond pour l'instant. Essayez un autre domaine.
          </p>
          <button
            onClick={() => { setStep(0); setCategoryId(undefined); }}
            className="mt-3 text-sm !text-indigo-600 hover:underline"
          >
            ← Recommencer
          </button>
        </>
      )}
    </section>
  );
}