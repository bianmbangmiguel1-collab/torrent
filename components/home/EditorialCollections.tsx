'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen } from 'lucide-react';

interface Product {
  id: number;
  title: string;
  slug: string;
  price: number;
  compare_price: number | null;
  main_image: string | null;
}

interface Collection {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  products: Product[];
}

export default function EditorialCollections({ collections }: { collections: Collection[] }) {
  if (!collections.length) return null;

  return (
    <section className="mb-10 md:mb-14">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Collections éditoriales
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Des sélections composées pour progresser plus vite.
          </p>
        </div>
        <Link
          href="/collections"
          className="hidden sm:flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Toutes les collections <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {collections.map((col) => (
          <Link
            key={col.id}
            href={`/collections/${col.slug}`}
            className="group relative rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
          >
            <div className="relative h-32 md:h-40 bg-gradient-to-br from-emerald-500 to-teal-600">
              {col.image && (
                <Image
                  src={col.image}
                  alt={col.name}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 transition"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <h3 className="font-bold text-lg leading-tight">{col.name}</h3>
                {col.description && (
                  <p className="text-xs text-white/80 line-clamp-1">{col.description}</p>
                )}
              </div>
            </div>

            <div className="p-4">
              <div className="flex gap-2 overflow-hidden mb-3">
                {col.products.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
                  >
                    {p.main_image && (
                      <Image
                        src={p.main_image}
                        alt={p.title}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                ))}
                {col.products.length > 4 && (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm flex-shrink-0">
                    +{col.products.length - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {col.products.length} ressources
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}