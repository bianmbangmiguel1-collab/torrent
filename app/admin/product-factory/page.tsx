'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react'

type Brief = {
  title: string
  positioning: string
  targetAudience: string
  customerOutcome: string
  outline: string[]
  deliverables: string[]
  salesDescription: string
  keywords: string[]
  metaTitle: string
  metaDescription: string
  validationNotes: string[]
}

export default function ProductFactoryPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState<Brief | null>(null)
  const [evidenceProvided, setEvidenceProvided] = useState(false)

  async function generateBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setBrief(null)

    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/admin/product-factory', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          category: form.get('category'),
          audience: form.get('audience'),
          problem: form.get('problem'),
          evidence: form.get('evidence'),
        }),
      })
      const data = await response.json()
      if (response.status === 401 || response.status === 403) {
        window.location.assign('/admin/login')
        return
      }
      if (!response.ok) throw new Error(data.error || 'Génération impossible')
      setBrief(data.brief)
      setEvidenceProvided(Boolean(data.evidenceProvided))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/products" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
          <ArrowLeft size={16} /> Retour au catalogue
        </Link>

        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-7 text-white shadow-xl sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-100">
                <Sparkles size={14} /> PRODUCT FACTORY · LAB
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Transformez une idée en brief produit.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Préparez un premier concept, son plan de contenu et une fiche de présentation. Chaque proposition reste un brouillon à vérifier avant toute commercialisation.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-blue-50">
              <p className="font-semibold">Validation humaine requise</p>
              <p className="mt-1 max-w-xs text-blue-100">L’IA ne réalise pas d’étude de marché indépendante et ne publie aucun produit.</p>
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={generateBrief} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-xl font-semibold">Définir l’idée</h2>
              <p className="mt-1 text-sm text-slate-500">Les notes et sources sont facultatives, mais aident à cadrer le travail.</p>
            </div>
            <label className="block text-sm font-medium">Titre provisoire
              <input name="title" required minLength={3} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Ex. Kit de gestion pour indépendants" />
            </label>
            <label className="block text-sm font-medium">Catégorie
              <select name="category" required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="">Sélectionner</option>
                <option>Ebooks et guides</option><option>Formations</option><option>Templates</option><option>Outils digitaux</option><option>Vidéos et ressources</option><option>Packs numériques</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Public cible
              <textarea name="audience" required maxLength={300} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Qui devrait utiliser ce produit ?" />
            </label>
            <label className="block text-sm font-medium">Problème à résoudre
              <textarea name="problem" required maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Quel besoin concret avez-vous identifié ?" />
            </label>
            <label className="block text-sm font-medium">Notes de recherche / sources vérifiées
              <textarea name="evidence" maxLength={1200} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Ajoutez vos observations ou références autorisées. L’IA ne les vérifiera pas automatiquement." />
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Préparation du brief…' : 'Générer un brief brouillon'}
            </button>
          </form>

          <section className="min-h-[520px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {!brief ? (
              <div className="flex h-full min-h-[440px] flex-col items-center justify-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700"><FileText size={28} /></div>
                <h2 className="mt-5 text-xl font-semibold">Votre brief apparaîtra ici</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Commencez par décrire une idée et les personnes qu’elle pourrait aider.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Brief · Brouillon IA</p><h2 className="mt-2 text-2xl font-semibold">{brief.title}</h2></div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><CheckCircle2 size={14} /> À valider</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{brief.positioning}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Public cible" text={brief.targetAudience} />
                  <InfoCard label="Résultat visé" text={brief.customerOutcome} />
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <ListBlock title="Plan proposé" items={brief.outline} />
                  <ListBlock title="Livrables possibles" items={brief.deliverables} />
                </div>
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">Description commerciale proposée</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{brief.salesDescription}</p>
                </div>
                <div className="mt-5">
                  <h3 className="text-sm font-semibold">Points à vérifier avant publication</h3>
                  <ul className="mt-2 space-y-2">{brief.validationNotes.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm text-slate-600"><span className="mt-0.5 text-amber-600">•</span>{item}</li>)}</ul>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                  <p><strong>Mots-clés proposés :</strong> {brief.keywords.join(' · ') || 'À compléter'}</p>
                  <p className="mt-1"><strong>SEO :</strong> {brief.metaTitle} — {brief.metaDescription}</p>
                  <p className="mt-2 text-amber-800">{evidenceProvided ? 'Les notes de recherche saisies n’ont pas été vérifiées par l’IA.' : 'Aucune source de recherche n’a été fournie : la demande n’est pas évaluée.'} Ce brief n’est ni une étude de marché ni une prévision commerciale.</p>
                </div>
                <Link href="/admin/products/new" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">Continuer dans le formulaire produit <ArrowRight size={16} /></Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function InfoCard({ label, text }: { label: string; text: string }) {
  return <div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-sm leading-5 text-slate-700">{text || 'À définir'}</p></div>
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-2 space-y-2">{items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm text-slate-600"><span className="text-blue-600">{index + 1}.</span>{item}</li>)}</ul></div>
}
