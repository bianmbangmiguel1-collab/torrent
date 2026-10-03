'use client';
import Link from 'next/link';
import { ArrowRight, Rocket } from 'lucide-react';

interface Step {
  id: number;
  step_number: number;
  title: string | null;
  product_title: string;
  product_slug: string;
  price: number;
}

interface Path {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  level: string | null;
  steps: Step[];
  totalPrice: number;
}

export default function LearningPaths({ paths }: { paths: Path[] }) {
  if (!paths.length) return null;

  return (
    <section className="mb-10 md:mb-14">
      <div className="mb-5">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Rocket className="w-5 h-5 text-purple-600" />
          Parcours guidés
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Des chemins structurés pour passer d'un objectif à un résultat, étape par étape.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {paths.map((path) => (
          <Link
            key={path.id}
            href={`/parcours/${path.slug}`}
            className="group rounded-2xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-lg p-5 transition-all"
          >
            {path.level && (
              <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 mb-3">
                {path.level}
              </span>
            )}
            <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-purple-700 transition">
              {path.title}
            </h3>
            {path.subtitle && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{path.subtitle}</p>
            )}

            <ol className="mt-4 space-y-2">
              {path.steps.slice(0, 4).map((step, i) => (
                <li key={step.id} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-gray-800 line-clamp-1 font-medium">
                    {step.title || step.product_title}
                  </p>
                </li>
              ))}
              {path.steps.length > 4 && (
                <li className="text-xs text-gray-400 pl-9">
                  +{path.steps.length - 4} autres étapes
                </li>
              )}
            </ol>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {path.steps.length} étapes · {path.totalPrice.toLocaleString()} FCFA
              </span>
              <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}