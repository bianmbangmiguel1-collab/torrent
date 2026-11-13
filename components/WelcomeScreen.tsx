'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Check, ChevronRight, Download, Search, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'

type QuizGoal = 'learn' | 'create' | 'grow'

const categories = [
  { name: 'Ebooks & guides', description: 'Des contenus pratiques à consulter à votre rythme.', icon: BookOpen, query: 'ebook' },
  { name: 'Formations', description: 'Développez des compétences avec des contenus structurés.', icon: Sparkles, query: 'formation' },
  { name: 'Templates & outils', description: 'Des ressources pour gagner du temps sur vos projets.', icon: Download, query: 'template' },
]

const quizOptions: { id: QuizGoal; title: string; description: string; search: string }[] = [
  { id: 'learn', title: 'Apprendre quelque chose', description: 'Guides, ebooks et formations.', search: 'formation' },
  { id: 'create', title: 'Créer plus facilement', description: 'Modèles, outils et ressources créatives.', search: 'template' },
  { id: 'grow', title: 'Faire avancer mon activité', description: 'Ressources utiles pour vos projets professionnels.', search: 'business' },
]

export default function WelcomeScreen() {
  const [quizOpen, setQuizOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<QuizGoal | null>(null)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      setIsFirstVisit(!window.localStorage.getItem('torrentwist-welcome-seen'))
    } catch {
      setIsFirstVisit(false)
    }
  }, [])

  function finishQuiz() {
    const choice = quizOptions.find((option) => option.id === selectedGoal)
    if (!choice) return
    try {
      window.localStorage.setItem('torrentwist-welcome-seen', 'true')
    } catch {
      // Le quiz reste utilisable même si le navigateur bloque le stockage local.
    }
    router.push(`/products?search=${encodeURIComponent(choice.search)}`)
  }

  function dismissWelcome() {
    try {
      window.localStorage.setItem('torrentwist-welcome-seen', 'true')
    } catch {
      // Le site ne dépend pas du stockage local.
    }
    setIsFirstVisit(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StorefrontHeader />
      <main>
        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-700">La boutique TorrentTwist</p>
              <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Les bonnes ressources pour votre prochain projet.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Découvrez des produits numériques, comparez les informations et choisissez ce qui vous sera vraiment utile. Vos achats restent accessibles depuis votre compte.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/avant" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
                  Explorer la boutique <ArrowRight size={17} />
                </Link>
                <button onClick={() => setQuizOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  M’aider à choisir <ChevronRight size={17} />
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-700" /> Paiement selon les moyens proposés au checkout</span>
                <span className="inline-flex items-center gap-2"><Download size={17} className="text-blue-700" /> Accès aux produits numériques après achat</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-blue-700"><ShoppingBag size={21} /></div>
                <div><p className="font-semibold text-slate-950">Choisir simplement</p><p className="text-sm text-slate-600">Un parcours clair, de la découverte à l’achat.</p></div>
              </div>
              <ol className="mt-7 space-y-5">
                {[
                  ['Parcourez', 'Filtrez les ressources par catégorie ou recherchez un produit.'],
                  ['Vérifiez', 'Consultez la description, le contenu et le prix avant de choisir.'],
                  ['Retrouvez', 'Suivez les étapes de paiement et retrouvez vos achats dans votre espace.'],
                ].map(([title, text], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700">{index + 1}</span>
                    <div><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {isFirstVisit && !quizOpen && (
          <div className="mx-auto mt-6 flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-slate-600">Première visite ? Le mini-quiz vous oriente vers les ressources qui correspondent à votre objectif.</p>
            <button onClick={dismissWelcome} className="shrink-0 text-sm text-slate-500 underline underline-offset-2">Masquer</button>
          </div>
        )}

        {quizOpen && (
          <section aria-labelledby="quiz-title" className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Guide de première visite</p><h2 id="quiz-title" className="mt-1 text-xl font-bold text-slate-950">Quel est votre objectif aujourd’hui ?</h2></div>
                <button onClick={() => setQuizOpen(false)} className="text-sm text-slate-500 hover:text-slate-900">Fermer</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {quizOptions.map((option) => {
                  const selected = selectedGoal === option.id
                  return (
                    <button key={option.id} onClick={() => setSelectedGoal(option.id)} aria-pressed={selected} className={`rounded-md border p-4 text-left transition ${selected ? 'border-blue-700 bg-blue-50 ring-1 ring-blue-700' : 'border-slate-200 hover:border-slate-400'}`}>
                      <span className="flex items-center justify-between gap-3 font-semibold text-slate-900">{option.title}{selected && <Check size={17} className="text-blue-700" />}</span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">{option.description}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={finishQuiz} disabled={!selectedGoal} className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Voir les ressources adaptées <ArrowRight size={17} /></button>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-blue-700">Explorer par besoin</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Que cherchez-vous ?</h2></div>
            <Link href="/categories" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Toutes les catégories <ArrowRight className="ml-1 inline" size={15} /></Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {categories.map(({ name, description, icon: Icon, query }) => (
              <Link key={name} href={`/products?search=${encodeURIComponent(query)}`} className="group rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
                <Icon size={22} className="text-blue-700" />
                <h3 className="mt-4 font-semibold text-slate-950">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Voir la sélection <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 py-9 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div><h2 className="text-xl font-bold text-slate-950">Prêt à trouver votre prochaine ressource ?</h2><p className="mt-1 text-sm text-slate-600">Parcourez le catalogue et utilisez la recherche pour aller droit au but.</p></div>
            <Link href="/products" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"><Search size={17} /> Ouvrir le catalogue</Link>
          </div>
        </section>
      </main>
      <footer className="bg-slate-950 px-4 py-8 text-sm text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center sm:px-2">
          <p>© {new Date().getFullYear()} TorrentTwist</p>
          <div className="flex gap-5"><Link href="/products" className="hover:text-white">Catalogue</Link><Link href="/login" className="hover:text-white">Mon compte</Link><Link href="/support" className="hover:text-white">Aide et support</Link></div>
        </div>
      </footer>
    </div>
  )
}
