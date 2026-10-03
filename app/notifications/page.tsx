// app/notifications/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Loader2,
  Check,
  X,
  Trash2,
  Clock,
  Sparkles,
  Package,
  Heart,
  ShoppingBag,
  User,
  Gift,
  Star,
  TrendingUp,
  Zap,
  Crown,
  Flame,
  BellRing,
  BellOff,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface Notification {
  id: number
  user_id: number
  type: 'success' | 'info' | 'warning' | 'error' | 'order' | 'favorite' | 'promotion' | 'system'
  title: string
  message: string
  read: boolean
  link?: string
  icon?: string
  created_at: string
  updated_at: string
}

interface NotificationsResponse {
  notifications?: Notification[]
  unread_count?: number
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/notifications')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT DES NOTIFICATIONS
  // ============================================================
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }

    try {
      console.log('🔍 Chargement des notifications...')
      
      const url = filter === 'unread' 
        ? '/api/notifications?unread=true&limit=50'
        : '/api/notifications?limit=50'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
      })

      console.log('📊 Status /api/notifications:', response.status)

      if (response.status === 401) {
        router.push('/login?redirect=/notifications')
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as NotificationsResponse
      console.log('✅ Notifications récupérées:', data.notifications?.length || 0)
      
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
      setError(null)
      
    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error)
      setError(error instanceof Error ? error.message : 'Impossible de charger vos notifications.')
    } finally {
      setLoading(false)
      if (isRefresh) {
        setRefreshing(false)
      }
    }
  }, [router, filter])

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    }
  }, [isAuthenticated, fetchNotifications])

  // ============================================================
  // MARQUER COMME LU
  // ============================================================
  const markAsRead = async (id: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notification_id: id }),
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
    } catch (error) {
      console.error('❌ Erreur marquage comme lu:', error)
    }
  }

  // ============================================================
  // MARQUER TOUT COMME LU
  // ============================================================
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ mark_all: true }),
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      
    } catch (error) {
      console.error('❌ Erreur marquage tout comme lu:', error)
    }
  }

  // ============================================================
  // SUPPRESSION EN MASSE
  // ============================================================
  const removeSelected = async () => {
    if (selectedIds.length === 0) return
    
    const confirmDelete = window.confirm(
      `Supprimer ${selectedIds.length} notification${selectedIds.length > 1 ? 's' : ''} ?`
    )
    if (!confirmDelete) return

    // Supprimer les notifications sélectionnées
    setNotifications(prev => 
      prev.filter(n => !selectedIds.includes(n.id))
    )
    setSelectedIds([])
    setIsBulkMode(false)
  }

  // ============================================================
  // TOGGLE SELECTION
  // ============================================================
  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(notifications.map(n => n.id))
    }
  }

  // ============================================================
  // FORMATAGE DES DATES
  // ============================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)} j`
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ============================================================
  // ICÔNES PAR TYPE
  // ============================================================
  const getIcon = (type: string) => {
    const iconMap: Record<string, { icon: any; color: string; bg: string }> = {
      'success': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
      'error': { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
      'warning': { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      'info': { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
      'order': { icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
      'favorite': { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
      'promotion': { icon: Gift, color: 'text-pink-500', bg: 'bg-pink-50' },
      'system': { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' },
    }
    const defaultIcon = { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50' }
    return iconMap[type] || defaultIcon
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================
  const total = notifications.length
  const read = notifications.filter(n => n.read).length
  const unread = notifications.filter(n => !n.read).length
  const hasUnread = unread > 0

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
            <Bell className="w-12 h-12 text-blue-500 mx-auto" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos notifications...</p>
          <p className="text-sm text-gray-400 mt-1">Préparation de votre espace</p>
        </div>
      </div>
    )
  }

  // ============================================================
  // AFFICHAGE DES ERREURS
  // ============================================================
  if (error) {
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
              fetchNotifications()
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
      {/* ============================================================
          HEADER
      ============================================================ */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                  <Bell className="w-6 h-6 text-blue-500" />
                  Notifications
                  {hasUnread && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {unread}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  {total} notification{total > 1 ? 's' : ''} • {read} lue{read > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtre */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 text-sm font-medium transition ${
                    filter === 'all' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-2 text-sm font-medium transition ${
                    filter === 'unread' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Non lues
                  {unread > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {unread}
                    </span>
                  )}
                </button>
              </div>

              {/* Mode sélection */}
              <button
                onClick={() => setIsBulkMode(!isBulkMode)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isBulkMode 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isBulkMode ? 'Annuler' : 'Sélectionner'}
              </button>

              {/* Rafraîchir */}
              <button
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                className="p-2 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Barre d'action en mode sélection */}
          <AnimatePresence>
            {isBulkMode && selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 text-sm text-blue-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === notifications.length}
                    onChange={toggleSelectAll}
                    className="rounded border-blue-300 text-blue-500 focus:ring-blue-400"
                  />
                  <span>{selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Marquer les sélectionnés comme lus
                      selectedIds.forEach(id => markAsRead(id))
                      setSelectedIds([])
                      setIsBulkMode(false)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Marquer comme lues
                  </button>
                  <button
                    onClick={removeSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton "Tout marquer comme lu" */}
          {hasUnread && !isBulkMode && (
            <div className="mt-3 text-right">
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 transition flex items-center gap-1 ml-auto"
              >
                <Check className="w-4 h-4" />
                Tout marquer comme lu
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================
          CONTENU PRINCIPAL
      ============================================================ */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Statistiques */}
        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Bell, label: 'Total', value: total, color: 'blue' },
              { icon: CheckCircle, label: 'Lues', value: read, color: 'green' },
              { icon: Clock, label: 'Non lues', value: unread, color: 'yellow' },
              { icon: Sparkles, label: 'Aujourd\'hui', value: notifications.filter(n => {
                const today = new Date()
                const date = new Date(n.created_at)
                return date.toDateString() === today.toDateString()
              }).length, color: 'purple' },
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
        )}

        {/* Liste des notifications */}
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/50"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6"
            >
              <BellOff className="w-12 h-12 text-blue-400" />
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'unread' 
                ? 'Vous avez lu toutes vos notifications 🎉'
                : 'Vous serez informé des nouveautés ici'
              }
            </p>
            {filter === 'unread' && (
              <button
                onClick={() => setFilter('all')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition font-medium"
              >
                Voir toutes les notifications
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notification, index) => {
                const { icon: Icon, color, bg } = getIcon(notification.type)
                const isSelected = selectedIds.includes(notification.id)
                const isExpanded = expandedId === notification.id

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group relative bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border ${
                      notification.read 
                        ? 'border-white/50 opacity-70' 
                        : 'border-blue-200 shadow-blue-200/30'
                    } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                    onClick={() => {
                      if (isBulkMode) {
                        toggleSelect(notification.id)
                      } else if (!notification.read) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    {/* Badge de sélection */}
                    {isBulkMode && (
                      <div className="absolute top-3 left-3 z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(notification.id)}
                          className="w-5 h-5 rounded border-blue-300 text-blue-500 focus:ring-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    <div className={`flex items-start gap-4 ${isBulkMode ? 'pl-8' : ''}`}>
                      {/* Icône */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={`font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'} mt-0.5 leading-relaxed`}>
                              {notification.message.length > 120 && !isExpanded
                                ? `${notification.message.substring(0, 120)}...`
                                : notification.message
                              }
                              {notification.message.length > 120 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedId(isExpanded ? null : notification.id)
                                  }}
                                  className="ml-1 text-blue-500 hover:text-blue-600 text-xs font-medium"
                                >
                                  {isExpanded ? 'Voir moins' : 'Voir plus'}
                                </button>
                              )}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && !isBulkMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                title="Marquer comme lu"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // Supprimer la notification
                                setNotifications(prev => 
                                  prev.filter(n => n.id !== notification.id)
                                )
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                              title="Supprimer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Date et lien */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(notification.created_at)}
                          </span>
                          {notification.link && (
                            <Link
                              href={notification.link}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 hover:text-blue-600 transition"
                            >
                              Voir plus →
                            </Link>
                          )}
                          {!notification.read && !isBulkMode && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}