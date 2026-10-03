// app/admin/collections/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Collection {
  id: number
  name: string
  slug: string
  description: string | null
  image: string | null
  product_ids: string | null
  product_count: number
  is_active: boolean
  position: number
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  active: number
  inactive: number
  totalProducts: number
}

interface Product {
  id: number
  title: string
  price: number
  slug: string
}

interface CollectionsResponse {
  collections?: Collection[];
  stats?: Stats;
  error?: string;
}

interface ProductsResponse {
  products?: Product[];
  error?: string;
}

interface CollectionActionResponse {
  error?: string;
  message?: string;
}

export default function AdminCollectionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, totalProducts: 0 })
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Collection | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    product_ids: [] as number[],
    is_active: true,
    position: 0,
  })

  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterActive === 'active') params.set('active', 'true')
      if (filterActive === 'inactive') params.set('active', 'false')

      const res = await fetch(`/api/admin/collections?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as CollectionsResponse
      setCollections(data.collections || [])
      setStats(data.stats || stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [search, filterActive])

  useEffect(() => { load() }, [load])

  const loadProducts = useCallback(async () => {
    if (allProducts.length > 0) return
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/admin/products?limit=500', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json() as ProductsResponse
        setAllProducts(data.products || [])
      }
    } catch {} finally {
      setLoadingProducts(false)
    }
  }, [allProducts.length])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '', slug: '', description: '', image: '',
      product_ids: [], is_active: true, position: 0,
    })
    setIsModalOpen(true)
    loadProducts()
  }

  const openEdit = (c: Collection) => {
    setEditing(c)
    let ids: number[] = []
    try {
      if (c.product_ids) {
        const parsed = JSON.parse(c.product_ids)
        ids = Array.isArray(parsed)
          ? parsed
              .map((x: unknown) => parseInt(String(x), 10))
              .filter((n: number) => !isNaN(n))
          : []
      }
    } catch {}
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      product_ids: ids,
      is_active: c.is_active,
      position: c.position || 0,
    })
    setIsModalOpen(true)
    loadProducts()
  }

  const handleNameChange = (name: string) => {
    const slug = !editing
      ? name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : form.slug

    setForm({
      ...form,
      name,
      slug,
    })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = editing
        ? { ...form, id: editing.id }
        : form
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as CollectionActionResponse
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setIsModalOpen(false)
      load()
    } catch (err) {
      alert(
        'Erreur : ' +
          (err instanceof Error ? err.message : 'Erreur inconnue')
      )
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (c: Collection) => {
    await fetch('/api/admin/collections', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, action: 'toggle' }),
    })
    load()
  }

  const remove = async (c: Collection) => {
    if (!confirm(`Supprimer la collection "${c.name}" ?`)) return
    await fetch(`/api/admin/collections?id=${c.id}`, { method: 'DELETE', credentials: 'include' })
    load()
  }

  const toggleProduct = (productId: number) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }))
  }

  const filteredProducts = allProducts.filter(p =>
    productSearch
      ? p.title.toLowerCase().includes(productSearch.toLowerCase())
      : true
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📚 Collections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Regroupez vos produits par thème (best-sellers, nouveautés, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            ➕ Nouvelle collection
          </button>
          <Link href="/admin" className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">← Dashboard</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Actives</div>
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-600 uppercase">Inactives</div>
          <div className="text-2xl font-bold text-gray-700">{stats.inactive}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Produits liés</div>
          <div className="text-2xl font-bold text-purple-700">{stats.totalProducts}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()) }} className="flex flex-wrap gap-3 items-end mb-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Nom, slug, description…" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Rechercher</button>
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setFilterActive('all') }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Réinitialiser</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {[
            { v: 'all' as const, l: 'Toutes' },
            { v: 'active' as const, l: 'Actives' },
            { v: 'inactive' as const, l: 'Inactives' },
          ].map(f => (
            <button key={f.v} onClick={() => setFilterActive(f.v)} className={`px-3 py-1.5 text-sm rounded-lg ${filterActive === f.v ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
      ) : collections.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📚</div>
          <p className="font-medium">Aucune collection</p>
          <p className="text-sm mt-1">Créez votre première collection pour regrouper vos produits</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">➕ Créer</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(c => (
            <div key={c.id} className={`bg-white border-2 rounded-lg overflow-hidden transition ${c.is_active ? 'border-green-200' : 'border-gray-200'}`}>
              {c.image ? (
                <div className="h-32 bg-gray-100 bg-cover bg-center" style={{ backgroundImage: `url(${c.image})` }} />
              ) : (
                <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <span className="text-5xl opacity-50">📚</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
                    <code className="text-[10px] text-gray-400 font-mono">/{c.slug}</code>
                  </div>
                  {c.is_active ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">● Active</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">● Inactive</span>
                  )}
                </div>

                {c.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                )}

                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                    📦 {c.product_count} produit{c.product_count > 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400">Position: {c.position}</span>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button onClick={() => toggle(c)} className={`px-3 py-1.5 text-xs rounded font-medium ${c.is_active ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {c.is_active ? '⏸️ Désactiver' : '▶️ Activer'}
                  </button>
                  <button onClick={() => openEdit(c)} className="flex-1 px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium">
                    ✏️ Modifier
                  </button>
                  <button onClick={() => remove(c)} className="px-2 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? '✏️ Modifier la collection' : '➕ Nouvelle collection'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 text-2xl">×</button>
            </div>

            <form onSubmit={save} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Image URL (optionnel)</label>
                <input type="text" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="/uploads/collections/mon-image.jpg" className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                  <input type="number" value={form.position} onChange={e => setForm({ ...form, position: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg w-full">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">Activer</span>
                  </label>
                </div>
              </div>

              {/* Sélection des produits */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Produits dans cette collection
                  </label>
                  <span className="text-xs text-blue-600 font-medium">
                    {form.product_ids.length} sélectionné{form.product_ids.length > 1 ? 's' : ''}
                  </span>
                </div>

                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="🔍 Rechercher un produit…" className="w-full px-3 py-2 border rounded-lg text-sm mb-2" />

                {loadingProducts ? (
                  <div className="text-center py-4 text-gray-500 text-xs">Chargement…</div>
                ) : (
                  <div className="border rounded-lg max-h-64 overflow-y-auto bg-gray-50">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-xs">Aucun produit trouvé</div>
                    ) : (
                      filteredProducts.map(p => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white border-b last:border-b-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.product_ids.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{p.title}</div>
                            <div className="text-xs text-gray-500">
                              {Number(p.price || 0).toLocaleString('fr-FR')} FCFA · #{p.id}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}