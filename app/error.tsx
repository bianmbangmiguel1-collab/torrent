'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCcw, ShieldAlert } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global app error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-[28px] border border-red-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-red-600">
            <ShieldAlert className="h-10 w-10" />
          </div>

          <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
            Erreur système
          </p>
          <h1 className="mt-4 text-center text-3xl font-bold text-slate-900">
            Une erreur est survenue
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-slate-600">
            Le site a rencontré un problème technique. Vous pouvez réessayer ou revenir à l’accueil.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Revenir à l’accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
