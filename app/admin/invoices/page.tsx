// app/admin/invoices/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Invoice {
  id: number
  invoice_number: string
  order_number: string
  user_email: string | null
  user_name: string | null
  product_title: string | null
  total: number
  currency: string
  status: string
  payment_status: string
  payment_method: string | null
  transaction_id: string | null
  paid_at: string | null
  created_at: string
}

interface Stats {
  total: number
  paid: number
  pending: number
  totalRevenue: number
  monthRevenue: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface InvoicesResponse {
  invoices?: Invoice[]
  stats?: Stats
  pagination?: {
    pages?: number
  }
  error?: string
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    paid: 0,
    pending: 0,
    totalRevenue: 0,
    monthRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('paid')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/api/admin/invoices?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)

      const data: InvoicesResponse = await res.json()
      setInvoices(data.invoices || [])
      setStats(data.stats || stats)
      setTotalPages(data.pagination?.pages || 1)
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page, status, search, from, to])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('paid')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const formatPrice = (amount: number, currency: string = 'XOF') => {
    return `${Number(amount || 0).toLocaleString('fr-FR')} ${currency}`
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return date
    }
  }

  const printInvoice = (invoice: Invoice) => {
    // Ouvre une petite fenêtre d'impression HTML
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Facture ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #2563eb; margin: 0 0 8px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; background: #dcfce7; color: #166534; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
          th { background: #f9fafb; }
          .total { font-size: 20px; font-weight: bold; color: #2563eb; text-align: right; padding-top: 20px; }
          .footer { margin-top: 60px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>TorrentTwist</h1>
            <p style="color:#6b7280;margin:0;">Facture ${invoice.invoice_number}</p>
            <p style="color:#6b7280;margin:4px 0 0;">Commande ${invoice.order_number}</p>
          </div>
          <div style="text-align:right;">
            <span class="badge">${invoice.payment_status === 'paid' ? 'PAYÉE' : invoice.payment_status.toUpperCase()}</span>
            <p style="color:#6b7280;margin:8px 0 0;">${formatDate(invoice.created_at)}</p>
          </div>
        </div>

        <div style="display:flex;gap:40px;margin-bottom:20px;">
          <div>
            <h3 style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;">Client</h3>
            <p style="margin:0;font-weight:bold;">${invoice.user_name || 'Anonyme'}</p>
            <p style="margin:0;color:#6b7280;">${invoice.user_email || '—'}</p>
          </div>
          <div>
            <h3 style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;">Méthode de paiement</h3>
            <p style="margin:0;">${invoice.payment_method || '—'}</p>
            <p style="margin:0;color:#6b7280;font-size:12px;">TXN: ${invoice.transaction_id || '—'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th style="text-align:right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoice.product_title || '—'}</td>
              <td style="text-align:right;">${formatPrice(invoice.total, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div class="total">
          Total : ${formatPrice(invoice.total, invoice.currency)}
        </div>

        <div class="footer">
          Merci pour votre achat sur TorrentTwist<br/>
          Ce document est une facture générée automatiquement.
        </div>
      </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-sm text-gray-500 mt-1">
            Générez et imprimez les factures clients
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total commandes</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Payées</div>
          <div className="text-2xl font-bold text-green-700">{stats.paid}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-yellow-600 uppercase">En attente</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Revenu total</div>
          <div className="text-lg font-bold text-blue-700">
            {formatPrice(stats.totalRevenue)}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Ce mois</div>
          <div className="text-lg font-bold text-purple-700">
            {formatPrice(stats.monthRevenue)}
          </div>
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
              placeholder="N° facture, commande, email, produit…"
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
              <option value="">Toutes</option>
              <option value="paid">Payées</option>
              <option value="pending">En attente</option>
              <option value="refunded">Remboursées</option>
              <option value="canceled">Annulées</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={from}
              onChange={e => { setFrom(e.target.value); setPage(1) }}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={to}
              onChange={e => { setTo(e.target.value); setPage(1) }}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Filtrer
          </button>

          <button
            type="button"
            onClick={resetFilters}
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
      ) : invoices.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🧾</div>
          <p className="font-medium">Aucune facture trouvée</p>
          <p className="text-sm mt-1">
            Les factures apparaissent ici dès qu'une commande est payée.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Facture</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-800 font-semibold">
                      {inv.invoice_number}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Cmd: {inv.order_number}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {inv.user_name || 'Anonyme'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {inv.user_email || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {inv.product_title || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        inv.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : inv.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {inv.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => printInvoice(inv)}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      🖨️ Imprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
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
    </div>
  )
}