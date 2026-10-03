// app/admin/pages/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Page {
  id: number
  title: string
  slug: string
  excerpt: string | null
  status: string
  template: string
  meta_title: string | null
  meta_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  published: number
  draft: number
  archived: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface PagesResponse {
  pages?: Page[]
  stats?: Stats
  pagination?: {
    pages?: number
  }
}

interface PageResponse {
  page?: {
    content?: string
  }
}

interface SavePageResponse {
  error?: string
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0, archived: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'draft',
    template: 'default',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  })
  const [saving, setSaving] = useState(false)

  const loadPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status) params.set('status', status)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/pages?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as PagesResponse
      setPages(data.pages || [])
      setStats(data.stats || stats)
      setTotalPages(data.pagination?.pages || 1)
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const openCreateModal = () => {
    setEditingPage(null)
    setForm({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'draft',
      template: 'default',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (p: Page) => {
    setEditingPage(p)
    setForm({
      title: p.title,
      slug: p.slug,
      content: '',
      excerpt: p.excerpt || '',
      status: p.status,
      template: p.template,
      meta_title: p.meta_title || '',
      meta_description: p.meta_description || '',
      meta_keywords: '',
    })
    setIsModalOpen(true)

    // Charger le contenu complet
    fetch(`/api/admin/pages?id=${p.id}`, { credentials: 'include' })
      .then(r => r.json() as Promise<PageResponse>)
      .then(data => {
        if (data.page) {
          setForm(f => ({ ...f, content: data.page?.content || '' }))
        }
      })
      .catch(() => {})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = '/api/admin/pages'
      const method = editingPage ? 'PUT' : 'POST'
      const body = editingPage ? { ...form, id: editingPage.id } : form

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as SavePageResponse
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setIsModalOpen(false)
      loadPages()
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette page ?')) return
    try {
      await fetch(`/api/admin/pages?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      loadPages()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleStatus = async (p: Page) => {
    const newStatus = p.status === 'published' ? 'draft' : 'published'
    try {
      await fetch('/api/admin/pages', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: newStatus }),
      })
      loadPages()
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return date
    }
  }

  const getStatusBadge = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      published: { label: '✅ Publiée', color: 'bg-green-100 text-green-700' },
      draft: { label: '📝 Brouillon', color: 'bg-yellow-100 text-yellow-700' },
      archived: { label: '📦 Archivée', color: 'bg-gray-100 text-gray-700' },
    }
    const v = map[s] || { label: s, color: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-0.5 text-xs rounded ${v.color}`}>{v.label}</span>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages CMS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les pages de contenu (À propos, CGV, FAQ…)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            ➕ Nouvelle page
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Publiées</div>
          <div className="text-2xl font-bold text-green-700">{stats.published}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-yellow-600 uppercase">Brouillons</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.draft}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-600 uppercase">Archivées</div>
          <div className="text-2xl font-bold text-gray-700">{stats.archived}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Titre, slug, contenu…"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Statut</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tous</option>
              <option value="published">Publiées</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archivées</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Filtrer
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStatus('')
              setPage(1)
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            Réinitialiser
          </button>
        </form>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium">Aucune page</p>
          <p className="text-sm mt-1">Créez votre première page de contenu</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            ➕ Créer une page
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Modifiée</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.title}</div>
                    {p.excerpt && (
                      <div className="text-xs text-gray-500 truncate max-w-md">
                        {p.excerpt}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      /{p.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(p.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        title={p.status === 'published' ? 'Dépublier' : 'Publier'}
                      >
                        {p.status === 'published' ? '👁️' : '📤'}
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                      >
                        ✏️ Éditer
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Page {page} sur {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPage ? '✏️ Modifier la page' : '➕ Nouvelle page'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e =>
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug:
                          !editingPage && !form.slug
                            ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                            : form.slug,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Extrait (résumé)
                </label>
                <input
                  type="text"
                  value={form.excerpt}
                  onChange={e => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Court résumé de la page"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contenu (HTML autorisé)
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="<h1>Titre</h1><p>Contenu…</p>"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="draft">📝 Brouillon</option>
                    <option value="published">✅ Publiée</option>
                    <option value="archived">📦 Archivée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <select
                    value={form.template}
                    onChange={e => setForm({ ...form, template: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="legal">Légal</option>
                    <option value="faq">FAQ</option>
                    <option value="landing">Landing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Meta Title (SEO)
                </label>
                <input
                  type="text"
                  value={form.meta_title}
                  onChange={e => setForm({ ...form, meta_title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Meta Description (SEO)
                </label>
                <textarea
                  value={form.meta_description}
                  onChange={e => setForm({ ...form, meta_description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {saving ? 'Enregistrement…' : editingPage ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}