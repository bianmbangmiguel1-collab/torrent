// app/invoices/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  Loader2, 
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  CreditCard,
  ShoppingBag,
  User,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  TrendingUp,
  Package,
  ChevronRight,
  Eye,
  Copy,
  CheckCheck,
  RefreshCw,
  Award,
  Crown,
  Zap,
  Gift,
  Search,
  Shield
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface InvoiceItem {
  product_title: string
  quantity: number
  price: number
  total: number
  product_file_path?: string
  product_format?: string
}

interface Invoice {
  id: number
  invoice_number: string
  order_number: string
  total: number
  subtotal: number
  tax: number
  currency: string
  status: string
  payment_status: string
  payment_method: string
  created_at: string
  invoice_date: string
  due_date: string
  user_name: string
  user_email: string
  user_phone?: string
  address?: string
  city?: string
  country?: string
  shipping_address?: string
  shipping_city?: string
  shipping_country?: string
  items: InvoiceItem[]
  download_token?: string
}

interface InvoicesApiResponse {
  invoices?: Invoice[]
  error?: string
  message?: string
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function InvoicesPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()
  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/invoices')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT DES FACTURES
  // ============================================================
  const fetchInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }

    try {
      const response = await fetch('/api/invoices', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401) {
        router.push('/login?redirect=/invoices')
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as InvoicesApiResponse
      setInvoices(data.invoices || [])
      setError(null)
      
    } catch (error) {
      console.error('❌ Erreur chargement factures:', error)
      setError(error instanceof Error ? error.message : 'Impossible de charger vos factures.')
    } finally {
      setLoading(false)
      if (isRefresh) {
        setRefreshing(false)
      }
    }
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices()
    }
  }, [isAuthenticated, fetchInvoices])

  // ============================================================
  // FILTRAGE
  // ============================================================
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       inv.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus
    return matchSearch && matchStatus
  })

  // ============================================================
  // STATISTIQUES
  // ============================================================
  const totalInvoices = invoices.length
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid').length
  const pendingInvoices = invoices.filter(inv => inv.payment_status === 'pending').length

  // ============================================================
  // FORMATAGE
  // ============================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + ' FCFA'
  }

  // ============================================================
  // IMPRIMER
  // ============================================================
  const handlePrint = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  // ============================================================
  // TÉLÉCHARGER
  // ============================================================
  const handleDownload = async (invoice: Invoice) => {
    try {
      alert('📄 Téléchargement de la facture #' + invoice.invoice_number)
      // Ici on pourrait générer un PDF
    } catch (error) {
      console.error('Erreur téléchargement:', error)
    }
  }

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <FileText className="w-12 h-12 text-blue-500 mx-auto" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos factures...</p>
          <p className="text-sm text-gray-400 mt-1">Préparation de vos documents</p>
        </div>
      </div>
    )
  }

  if (error && invoices.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Erreur de chargement</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchInvoices()
            }}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Retour</span>
              </Link>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-500" />
                  Mes factures
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  {totalInvoices} facture{totalInvoices > 1 ? 's' : ''} • {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchInvoices(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 text-sm font-medium text-gray-700"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Chargement...' : 'Rafraîchir'}
              </button>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une facture..."
                className="w-full pl-9 pr-4 py-2 bg-white/80 rounded-xl border border-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-gray-900"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/80 rounded-xl border border-white/50 text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payées</option>
              <option value="pending">En attente</option>
              <option value="completed">Terminées</option>
            </select>
          </div>
        </div>
      </header>

      {/* STATISTIQUES */}
      {totalInvoices > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: FileText, label: 'Total factures', value: totalInvoices, color: 'blue' },
              { icon: CheckCircle, label: 'Payées', value: paidInvoices, color: 'green' },
              { icon: Clock, label: 'En attente', value: pendingInvoices, color: 'yellow' },
              { icon: TrendingUp, label: 'Montant total', value: formatCurrency(totalAmount), color: 'purple' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50"
              >
                <stat.icon className={`w-5 h-5 text-${stat.color}-500 mb-2`} />
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* LISTE DES FACTURES */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filteredInvoices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/50"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6"
            >
              <FileText className="w-12 h-12 text-blue-400" />
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucune facture'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? `Aucune facture ne correspond à "${searchTerm}"`
                : 'Vous n\'avez pas encore de factures disponibles'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition font-medium"
              >
                <ShoppingBag className="w-5 h-5" />
                Découvrir les produits
                <ChevronRight className="w-4 h-4" />
              </Link>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Numéro et date */}
                  <div>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <p className="font-bold text-gray-900 text-lg">
                        {invoice.invoice_number}
                      </p>
                      {invoice.payment_status === 'paid' && (
                        <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
                          Payée ✅
                        </span>
                      )}
                      {invoice.payment_status === 'pending' && (
                        <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full">
                          En attente ⏳
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Commande #{invoice.order_number} • {formatDate(invoice.created_at)}
                    </p>
                  </div>

                  {/* Montant */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {invoice.items?.length || 0} produit{invoice.items?.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice)
                        setShowInvoiceModal(true)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                    <button
                      onClick={() => handlePrint(invoice)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(invoice)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>

                {/* Aperçu des produits */}
                {invoice.items && invoice.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <div className="flex flex-wrap gap-2">
                      {invoice.items.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          {item.product_title} × {item.quantity}
                        </span>
                      ))}
                      {invoice.items.length > 3 && (
                        <span className="text-sm text-gray-400">
                          +{invoice.items.length - 3} autres
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DES DÉTAILS DE LA FACTURE */}
      <AnimatePresence>
        {showInvoiceModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInvoiceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête facture */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Facture #{selectedInvoice.invoice_number}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Commande #{selectedInvoice.order_number} • {formatDate(selectedInvoice.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(selectedInvoice)}
                    className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                  >
                    <Printer className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDownload(selectedInvoice)}
                    className="p-2 bg-green-100 rounded-xl hover:bg-green-200 transition"
                  >
                    <Download className="w-5 h-5 text-green-600" />
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Infos client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Client
                  </h3>
                  <p className="font-medium text-gray-900">{selectedInvoice.user_name || user?.name}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedInvoice.user_email || user?.email}
                  </p>
                  {selectedInvoice.user_phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedInvoice.user_phone}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-500" />
                    Paiement
                  </h3>
                  <p className="text-sm text-gray-600">
                    Méthode: {selectedInvoice.payment_method || 'Non spécifiée'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Statut: {selectedInvoice.payment_status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date d'émission: {formatDate(selectedInvoice.created_at)}
                  </p>
                </div>
              </div>

              {/* Articles */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Articles</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 p-3 bg-gray-100 text-sm font-medium text-gray-600">
                    <span className="col-span-2">Produit</span>
                    <span className="text-center">Quantité</span>
                    <span className="text-right">Total</span>
                  </div>
                  {selectedInvoice.items?.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-4 p-3 border-t border-gray-200 text-sm">
                      <span className="col-span-2 font-medium text-gray-900">{item.product_title}</span>
                      <span className="text-center text-gray-600">× {item.quantity}</span>
                      <span className="text-right font-bold text-gray-900">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totaux */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{formatCurrency(selectedInvoice.subtotal || selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Taxes</span>
                  <span>{formatCurrency(selectedInvoice.tax || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => handleDownload(selectedInvoice)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition font-medium"
                >
                  <Download className="w-5 h-5" />
                  Télécharger PDF
                </button>
                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                >
                  <Printer className="w-5 h-5" />
                  Imprimer
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}