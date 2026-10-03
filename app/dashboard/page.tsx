// app/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ShoppingBag, Heart, Star, Clock, AlertCircle, Sparkles, Wallet, Award,
  Eye, ChevronRight, Plus, TrendingUp, Zap, User, LogOut, Settings,
  Package, RefreshCw, Search, Grid3x3, List, ArrowUpRight, Activity,
  ShoppingCart, CheckCircle, XCircle, Loader2, Bell, Mail, CreditCard,
  Download, FileText, Home, BarChart, Layers, Trash2, Minus,
  Plus as PlusIcon, Truck, FileCheck, ShieldCheck, Crown, Gift, Flame,
  Tag, Menu, X, ChevronDown, Filter, Calendar, DollarSign, BellRing,
  BellOff, EyeOff, MessageCircle, ThumbsUp, Share2, Bookmark,
  Clock as ClockIcon, TrendingDown, ArrowUp, ArrowDown, MoreHorizontal,
  Copy, Check, AlertTriangle, Info, HelpCircle, LifeBuoy, StarHalf,
  Trophy, Target, Rocket, Coins, Percent, PartyPopper, HeartHandshake,
  Lightbulb, Sun, Flag, Award as AwardIcon, Compass,
} from 'lucide-react'

import { useUser } from '@/context/UserContext'
import AppHeader from '@/components/AppHeader'
import MorningFlow, {
  type Step as JourneyStep,
  type Goal,
  type Journey,
} from '@/components/MorningFlow'

// ============================================================
// TYPES
// ============================================================

interface Product {
  id: number
  title: string
  slug: string
  description: string
  price: number
  compare_price?: number
  avg_rating?: number
  sales: number
  badge?: string
  image: string
  category: string
  is_new?: boolean
  is_featured?: boolean
  reason?: string
}

interface CartItem {
  id: number
  product_id: number
  title: string
  price: number
  quantity: number
  image?: string
  total: number
}

interface UserStats {
  total_purchases: number
  total_spent: number
  total_favorites: number
  total_reviews: number
  total_views: number
  total_clicks: number
  engagement_score: number
  cart_items: number
  pending_orders: number
  completed_orders: number
  level: number
  next_level_progress: number
}

interface OrderItem {
  product_id: number
  title: string
  quantity: number
  price: number
  total: number
}

interface Order {
  id: number
  order_number: string
  total: number
  subtotal: number
  status: string
  payment_status: string
  payment_method: string
  created_at: string
  updated_at: string
  products: OrderItem[]
  product_title: string
  download_url?: string
  invoice_url?: string
}

interface Activity {
  id: number
  action_type: string
  product_id?: number
  product_title?: string
  created_at: string
  metadata?: any
}

interface Notification {
  id: number
  type: string
  title: string
  message: string
  is_read: number
  read: boolean
  created_at: string
  link?: string
  metadata?: any
}

interface Badge {
  id: string
  name: string
  icon: any
  description: string
  unlocked: boolean
  progress: number
  color: string
}

interface GoalsResponse {
  goal: Goal | null
  journey: Journey | null
  steps: JourneyStep[]
}

interface JourneyProductsResponse {
  products?: Product[]
}

interface StatsResponse {
  stats?: Partial<UserStats> & {
    total_spent?: number
  }
}

interface OrdersResponse {
  orders?: Order[]
}

interface FavoritesResponse {
  favorites?: Product[]
}

interface ActivitiesResponse {
  activities?: Activity[]
}

interface NotificationsResponse {
  notifications?: Notification[]
  unreadCount?: number
  unread_count?: number
}

interface RecommendationsResponse {
  products?: Product[]
}

interface CartResponse {
  items?: CartItem[]
}

interface DownloadErrorResponse {
  error?: string
}

// ============================================================
// 🎨 COMPOSANTS D'ANIMATION
// ============================================================

const shimmerAnimation = {
  initial: { backgroundPosition: '-1000px 0' },
  animate: { backgroundPosition: '1000px 0' },
  transition: { repeat: Infinity, duration: 2, ease: 'linear' }
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%] rounded ${className}`}
      {...shimmerAnimation}
    />
  )
}

function Toast({ type, title, message, onClose }: { type: string; title: string; message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: { bg: 'bg-gradient-to-r from-emerald-500 to-green-500', icon: CheckCircle },
    error: { bg: 'bg-gradient-to-r from-red-500 to-rose-500', icon: XCircle },
    info: { bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', icon: Info },
    warning: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', icon: AlertTriangle },
  }
  const s = styles[type as keyof typeof styles] || styles.info
  const Icon = s.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`fixed top-6 right-6 z-[100] ${s.bg} text-white rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-md`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold">{title}</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button onClick={onClose} className="opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

function ProgressBar({ value, label, color = 'blue' }: { value: number; label?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-yellow-500',
    red: 'from-red-500 to-rose-500',
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{label}</span>
          <span className="font-medium text-gray-700">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colors[color] || colors.blue} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color, delay = 0, trend }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-yellow-500',
    red: 'from-red-500 to-rose-500',
    indigo: 'from-indigo-500 to-purple-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="relative bg-white rounded-2xl p-4 border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-0 group-hover:opacity-5 transition-opacity`} />

      <div className="relative">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-3 tabular-nums">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>

        {trend !== undefined && (
          <div className={`absolute top-4 right-4 flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-400'
          }`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : trend < 0 ? <ArrowDown className="w-3 h-3" /> : null}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}

function BadgeCard({ badge }: { badge: Badge }) {
  const Icon = badge.icon
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: badge.unlocked ? [0, -5, 5, 0] : 0 }}
      transition={{ duration: 0.3 }}
      className={`relative p-4 rounded-2xl border-2 text-center transition-all ${
        badge.unlocked
          ? `bg-gradient-to-br ${badge.color} border-transparent shadow-lg`
          : 'bg-gray-50 border-gray-200 opacity-60 grayscale'
      }`}
    >
      {badge.unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </motion.div>
      )}
      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
        badge.unlocked ? 'bg-white/30' : 'bg-gray-200'
      }`}>
        <Icon className={`w-6 h-6 ${badge.unlocked ? 'text-white' : 'text-gray-400'}`} />
      </div>
      <p className={`text-xs font-bold ${badge.unlocked ? 'text-white' : 'text-gray-500'}`}>
        {badge.name}
      </p>
      <p className={`text-[10px] mt-0.5 ${badge.unlocked ? 'text-white/80' : 'text-gray-400'}`}>
        {badge.description}
      </p>
    </motion.div>
  )
}

// ============================================================
// NOTIFICATION ITEM (mini)
// ============================================================

const NOTIF_TYPE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  reminder:    { icon: Sun,        color: 'text-amber-600',   bg: 'bg-amber-50' },
  journey:     { icon: Target,     color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  success:     { icon: CheckCircle,color: 'text-emerald-600', bg: 'bg-emerald-50' },
  achievement: { icon: Award,      color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  product_tip: { icon: Lightbulb,  color: 'text-purple-600',  bg: 'bg-purple-50' },
  promotion:   { icon: Gift,       color: 'text-pink-600',    bg: 'bg-pink-50' },
  order:       { icon: Package,    color: 'text-blue-600',    bg: 'bg-blue-50' },
  favorite:    { icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50' },
  warning:     { icon: AlertCircle,color: 'text-orange-600',  bg: 'bg-orange-50' },
  error:       { icon: AlertCircle,color: 'text-red-600',     bg: 'bg-red-50' },
  info:        { icon: Info,       color: 'text-sky-600',     bg: 'bg-sky-50' },
  system:      { icon: Bell,       color: 'text-gray-600',    bg: 'bg-gray-50' },
}

function getNotifConfig(type: string) {
  return NOTIF_TYPE_ICONS[type] || NOTIF_TYPE_ICONS.info
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading, isAuthenticated, logout } = useUser()

  const hasLoaded = useRef(false)
  const isFetching = useRef(false)
  const mounted = useRef(true)

  // --- Data states ---
  const [stats, setStats] = useState<UserStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [journeyProducts, setJourneyProducts] = useState<Product[]>([])
  const [favorites, setFavorites] = useState<Product[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // --- Journey states ---
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null)
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([])

  // --- UI states ---
  const [greeting, setGreeting] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  const [dataLoading, setDataLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [cartLoading, setCartLoading] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'orders' | 'cart' | 'favorites'>('overview')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [toasts, setToasts] = useState<any[]>([])
  const [showBadges, setShowBadges] = useState(false)

  // ============================================================
  // TOASTS
  // ============================================================
  const addToast = useCallback((type: string, title: string, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, title, message }])
  }, [])

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // ============================================================
  // BADGES / GAMIFICATION
  // ============================================================
  const badges: Badge[] = useMemo(() => [
    {
      id: 'first_purchase',
      name: 'Premier achat',
      icon: ShoppingBag,
      description: 'Bienvenue !',
      unlocked: (stats?.total_purchases || 0) >= 1,
      progress: Math.min(((stats?.total_purchases || 0) / 1) * 100, 100),
      color: 'from-blue-400 to-blue-600',
    },
    {
      id: 'collector',
      name: 'Collectionneur',
      icon: Layers,
      description: '5 produits',
      unlocked: (stats?.total_purchases || 0) >= 5,
      progress: Math.min(((stats?.total_purchases || 0) / 5) * 100, 100),
      color: 'from-purple-400 to-purple-600',
    },
    {
      id: 'whale',
      name: 'Grand client',
      icon: Crown,
      description: '10 achats',
      unlocked: (stats?.total_purchases || 0) >= 10,
      progress: Math.min(((stats?.total_purchases || 0) / 10) * 100, 100),
      color: 'from-amber-400 to-yellow-600',
    },
    {
      id: 'spender',
      name: 'Dépensier',
      icon: Coins,
      description: '100k FCFA',
      unlocked: (stats?.total_spent || 0) >= 100000,
      progress: Math.min(((stats?.total_spent || 0) / 100000) * 100, 100),
      color: 'from-emerald-400 to-teal-600',
    },
    {
      id: 'lover',
      name: 'Fidèle',
      icon: Heart,
      description: '10 favoris',
      unlocked: (stats?.total_favorites || 0) >= 10,
      progress: Math.min(((stats?.total_favorites || 0) / 10) * 100, 100),
      color: 'from-pink-400 to-rose-600',
    },
    {
      id: 'critic',
      name: 'Critique',
      icon: Star,
      description: '5 avis',
      unlocked: (stats?.total_reviews || 0) >= 5,
      progress: Math.min(((stats?.total_reviews || 0) / 5) * 100, 100),
      color: 'from-indigo-400 to-blue-600',
    },
    {
      id: 'journey_starter',
      name: 'Bâtisseur',
      icon: Target,
      description: 'Parcours lancé',
      unlocked: !!activeJourney,
      progress: activeJourney ? 100 : 0,
      color: 'from-indigo-400 to-purple-600',
    },
    {
      id: 'journey_finisher',
      name: 'Accompli',
      icon: Trophy,
      description: 'Parcours terminé',
      unlocked: activeJourney?.status === 'completed',
      progress: activeJourney?.status === 'completed' ? 100 : (activeJourney?.progress_percent || 0),
      color: 'from-amber-400 to-pink-600',
    },
  ], [stats, activeJourney])

  const unlockedBadges = badges.filter(b => b.unlocked).length

  // ============================================================
  // HEURE / DATE / SALUTATION
  // ============================================================
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bonjour')
    else if (hour < 18) setGreeting('Bon après-midi')
    else setGreeting('Bonsoir')

    const updateDateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      setCurrentDate(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    updateDateTime()
    const interval = setInterval(updateDateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!userLoading && !isAuthenticated) router.replace('/login')
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT : PARCOURS ACTIF
  // ============================================================
  const loadActiveJourney = useCallback(async () => {
    try {
      const res = await fetch('/api/goals', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json() as GoalsResponse

      setActiveGoal(data.goal || null)
      setActiveJourney(data.journey || null)
      setJourneySteps(data.steps || [])

      // Charger les produits liés à l'étape en cours
      if (data.steps && data.steps.length > 0) {
        const currentStep = data.steps.find(
          (s: JourneyStep) => s.status === 'available' || s.status === 'in_progress'
        )
        if (currentStep) {
          try {
            const prodRes = await fetch(
              `/api/recommendations/for-step?stepId=${currentStep.id}`,
              { credentials: 'include' }
            )
            if (prodRes.ok) {
              const prodData = await prodRes.json() as JourneyProductsResponse
              setJourneyProducts(prodData.products || [])
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('⚠️ loadActiveJourney :', err)
    }
  }, [])

  // ============================================================
  // TÉLÉCHARGEMENT
  // ============================================================
  const handleDownload = async (orderId: number, downloadUrl: string, productTitle: string) => {
    if (!downloadUrl) {
      addToast('error', '❌ Fichier non disponible', 'Aucun fichier pour ce produit')
      return
    }
    setDownloading(orderId)
    try {
      const response = await fetch(`/api/orders/download/${orderId}`, { credentials: 'include' })
      if (!response.ok) {
        const errorData = await response.json() as DownloadErrorResponse
        throw new Error(errorData.error || 'Erreur')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${productTitle || 'produit'}.zip`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      addToast('success', '✅ Téléchargement réussi', filename)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      addToast('error', '❌ Échec du téléchargement', message)
    } finally {
      setDownloading(null)
    }
  }

  // ============================================================
  // PANIER
  // ============================================================
  const loadCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json() as CartResponse
        setCartItems(data.items || [])
      }
    } catch (err) { console.error(err) }
  }, [])

  const updateCartQuantity = async (productId: number, quantity: number) => {
    setCartLoading(true)
    try {
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity })
      })
      if (response.ok) {
        await loadCart()
        addToast('success', '✅ Panier mis à jour', `Quantité : ${quantity}`)
      }
    } catch (err) {
      addToast('error', '❌ Erreur', 'Impossible de mettre à jour')
    } finally {
      setCartLoading(false)
    }
  }

  const removeFromCart = async (productId: number) => {
    setCartLoading(true)
    try {
      const response = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId })
      })
      if (response.ok) {
        await loadCart()
        addToast('info', '🗑️ Retiré du panier', 'Produit supprimé')
      }
    } catch (err) {
      addToast('error', '❌ Erreur', 'Impossible de retirer')
    } finally {
      setCartLoading(false)
    }
  }

  const clearCart = async () => {
    setCartLoading(true)
    try {
      const response = await fetch('/api/cart/clear', { method: 'POST', credentials: 'include' })
      if (response.ok) {
        setCartItems([])
        addToast('info', '🧹 Panier vidé', 'Tous les articles retirés')
      }
    } finally {
      setCartLoading(false)
    }
  }

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [cartItems])

  const getCartItemCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [cartItems])

  // ============================================================
  // NOTIFICATIONS : marquer comme lu + panneau
  // ============================================================
  const markNotificationRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {}
  }

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      })
    } catch {}
  }

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isFetching.current && !isRefresh) return
    if (!isRefresh && hasLoaded.current) return

    isFetching.current = true
    if (isRefresh) setRefreshing(true)

    try {
      // --- Parcours actif (en priorité) ---
      await loadActiveJourney()

      // --- Stats utilisateur ---
      const statsRes = await fetch('/api/users/stats', { credentials: 'include' })
      if (statsRes.status === 401) { router.push('/login'); return }
      if (statsRes.ok) {
        const statsData = await statsRes.json() as StatsResponse
        if (statsData.stats) {
          setStats({
            ...statsData.stats,
            pending_orders: 0,
            completed_orders: 0,
            level: Math.floor((statsData.stats.total_spent || 0) / 50000) + 1,
            next_level_progress:
              ((statsData.stats.total_spent || 0) % 50000) / 50000 * 100,
          } as UserStats)
        }
      }

      // --- Commandes ---
      const ordersRes = await fetch('/api/orders', { credentials: 'include' })
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json() as OrdersResponse
        setOrders(ordersData.orders || [])
      }

      // --- Panier ---
      await loadCart()

      // --- Favoris ---
      const favRes = await fetch('/api/users/favorites', { credentials: 'include' })
      if (favRes.ok) {
        const favData = await favRes.json() as FavoritesResponse
        setFavorites(favData.favorites || [])
      }

      // --- Activités ---
      const actRes = await fetch('/api/users/activities?limit=5', { credentials: 'include' })
      if (actRes.ok) {
        const actData = await actRes.json() as ActivitiesResponse
        setActivities(actData.activities || [])
      }

      // --- Notifications ---
      try {
        const notifRes = await fetch('/api/notifications?limit=10&stats=true', { credentials: 'include' })
        if (notifRes.ok) {
          const notifData = await notifRes.json() as NotificationsResponse
          setNotifications(notifData.notifications || [])
          setUnreadCount(notifData.unreadCount || notifData.unread_count || 0)
        }
      } catch {}

      // --- Recommandations générales (fallback) ---
      try {
        const recRes = await fetch('/api/products?limit=8&sort=popular', { credentials: 'include' })
        if (recRes.ok) {
          const recData = await recRes.json() as RecommendationsResponse
          setRecommendations(recData.products || [])
        }
      } catch {}

      hasLoaded.current = true
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setDataLoading(false)
      isFetching.current = false
      if (isRefresh) setRefreshing(false)
    }
  }, [router, loadCart, loadActiveJourney])

  useEffect(() => {
    if (userLoading) return
    if (!isAuthenticated) { router.replace('/login'); return }
    if (!hasLoaded.current && !isFetching.current && mounted.current) {
      loadDashboardData()
    }
    return () => { mounted.current = false }
  }, [userLoading, isAuthenticated, router, loadDashboardData])

  // ============================================================
  // HELPERS
  // ============================================================
  const stripHtml = (html: string): string => {
    if (!html) return ''
    const stripped = html.replace(/<[^>]*>/g, '')
    const decoded = stripped.replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '')
    return decoded.length > 100 ? decoded.substring(0, 100) + '...' : decoded
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
      processing: { label: 'En traitement', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Truck },
      completed: { label: 'Terminée', color: 'bg-green-100 text-green-700 border-green-200', icon: FileCheck },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
      refunded: { label: 'Remboursée', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
    }
    const s = map[status] || map['pending']
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
        <Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'view': return <Eye size={16} className="text-blue-500" />
      case 'purchase': return <ShoppingBag size={16} className="text-green-500" />
      case 'favorite_add': return <Heart size={16} className="text-red-500" />
      case 'cart_add': return <Plus size={16} className="text-purple-500" />
      default: return <Zap size={16} className="text-yellow-500" />
    }
  }

  const formatDate = (date: string) => {
    if (!date) return 'Date inconnue'
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return 'Date invalide'
      const diff = new Date().getTime() - d.getTime()
      if (diff < 60000) return 'À l\'instant'
      if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
      if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch { return 'Date invalide' }
  }

  // Recommandations : priorité aux produits du parcours, sinon fallback
  const filteredRecommendations = useMemo(() => {
    const source = journeyProducts.length > 0 ? journeyProducts : recommendations
    if (!searchTerm.trim()) return source
    const q = searchTerm.toLowerCase()
    return source.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.category?.toLowerCase() || '').includes(q)
    )
  }, [journeyProducts, recommendations, searchTerm])

  // Étape en cours du parcours
  const currentStep = useMemo(
    () => journeySteps.find(s => s.status === 'available' || s.status === 'in_progress') || null,
    [journeySteps]
  )

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (userLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12 text-indigo-600 mx-auto" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-gray-600 font-medium"
          >
            Chargement de votre espace...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <AppHeader />

      {/* 🎨 TOASTS */}
      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ============================================================
            🎯 MORNING FLOW — LE COEUR DU SYSTÈME
        ============================================================ */}
        <MorningFlow
          onJourneyChange={(goal, journey, steps) => {
            setActiveGoal(goal)
            setActiveJourney(journey)
            setJourneySteps(steps || [])
            // Recharger les produits liés
            const current = (steps || []).find((s: JourneyStep) =>
              s.status === 'available' || s.status === 'in_progress'
            )
            if (current) {
              fetch(`/api/recommendations/for-step?stepId=${current.id}`, {
                credentials: 'include',
              })
                .then(async r => {
                  if (!r.ok) return null
                  return await r.json() as JourneyProductsResponse
                })
                .then(d => {
                  if (d) {
                    setJourneyProducts(d.products || [])
                  }
                })
                .catch(() => {})
            }
          }}
        />

        {/* ============================================================
            🎯 EN-TÊTE
        ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3 flex-wrap"
            >
              <span>{greeting}</span>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {user?.name || 'Utilisateur'}
              </span>
              <motion.span
                animate={{ rotate: [0, 20, -10, 20, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                className="text-2xl"
              >
                👋
              </motion.span>
            </motion.h1>
            <p className="text-gray-500 flex items-center gap-2 mt-1 text-sm">
              <ClockIcon className="w-4 h-4" />
              {currentTime} • {currentDate}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowBadges(!showBadges)}
              className="relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-xl hover:from-amber-200 hover:to-yellow-200 transition"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">
                {unlockedBadges}/{badges.length}
              </span>
            </motion.button>

            {stats?.level && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200"
              >
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">Niv. {stats.level}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { hasLoaded.current = false; loadDashboardData(true) }}
              disabled={refreshing}
              className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <AnimatePresence>
                {getCartItemCount() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
                  >
                    {getCartItemCount()}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Cloche Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>

            <Link href="/settings" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              <Settings className="w-5 h-5 text-gray-600" />
            </Link>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* ============================================================
            🏆 PANNEAU DES BADGES
        ============================================================ */}
        <AnimatePresence>
          {showBadges && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Vos succès ({unlockedBadges}/{badges.length})
                  </h2>
                  <button onClick={() => setShowBadges(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {badges.map((badge, idx) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <BadgeCard badge={badge} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            📊 STATS CARDS
        ============================================================ */}
        <section className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={ShoppingBag} value={stats?.total_purchases || 0} label="Achats" color="blue" delay={0} />
            <StatCard icon={Heart} value={stats?.total_favorites || 0} label="Favoris" color="red" delay={0.05} />
            <StatCard icon={Star} value={stats?.total_reviews || 0} label="Avis" color="amber" delay={0.1} />
            <StatCard icon={Wallet} value={`${(stats?.total_spent || 0).toLocaleString()} F`} label="Dépensé" color="green" delay={0.15} />
            <StatCard icon={Award} value={stats?.level || 1} label="Niveau" color="purple" delay={0.2} />
            <StatCard icon={ShoppingCart} value={getCartItemCount()} label="Panier" color="indigo" delay={0.25} />
          </div>
        </section>

        {/* ============================================================
            📈 PROGRESSION NIVEAU
        ============================================================ */}
        {stats && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl overflow-hidden relative"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center"
                >
                  <Rocket className="w-8 h-8" />
                </motion.div>
                <div>
                  <p className="text-sm opacity-90">Progression</p>
                  <p className="text-2xl font-bold">Niveau {stats.level || 1}</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="opacity-90">Prochain niveau</span>
                  <span className="font-bold">{Math.round(stats.next_level_progress || 0)}%</span>
                </div>
                <div className="h-3 bg-white/20 backdrop-blur rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.next_level_progress || 0}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full shadow-lg"
                  />
                </div>
                <p className="text-xs opacity-80 mt-2">
                  Encore {Math.max(0, 50000 - ((stats.total_spent || 0) % 50000)).toLocaleString()} F pour monter
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* ============================================================
            🔔 POPUP NOTIFICATIONS
        ============================================================ */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-xl p-5 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Tout lire
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {notifications.map((notif, idx) => {
                    const cfg = getNotifConfig(notif.type)
                    const Icon = cfg.icon
                    const isUnread = notif.is_read === 0
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          if (isUnread) markNotificationRead(notif.id)
                          if (notif.link) router.push(notif.link)
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition ${
                          isUnread
                            ? 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notif.title}
                            </p>
                            <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-xs text-gray-400 mt-1 block">{formatDate(notif.created_at)}</span>
                          </div>
                          {isUnread && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"
                            />
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
              <Link
                href="/notifications"
                className="mt-3 block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Voir toutes les notifications →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            🛒 POPUP PANIER
        ============================================================ */}
        <AnimatePresence>
          {showCart && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-xl p-5 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  Panier ({getCartItemCount()} article{getCartItemCount() > 1 ? 's' : ''})
                </h3>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm mb-3">Panier vide</p>
                  <Link href="/products" className="text-sm text-indigo-600 hover:underline font-medium">
                    Découvrir les produits →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                    {cartItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                      >
                        <img
                          src={item.image || '/images/placeholder.png'}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                          <p className="text-sm text-indigo-600 font-bold">{item.price.toLocaleString()} F</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateCartQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                            className="p-1 hover:bg-white rounded-lg"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </motion.button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                            className="p-1 hover:bg-white rounded-lg"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeFromCart(item.product_id)}
                            className="p-1 hover:bg-red-50 rounded-lg ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-600">Total</span>
                      <motion.span
                        key={getCartTotal()}
                        initial={{ scale: 1.2, color: '#4f46e5' }}
                        animate={{ scale: 1, color: '#111827' }}
                        className="text-xl font-bold"
                      >
                        {getCartTotal().toLocaleString()} F
                      </motion.span>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={clearCart}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium"
                      >
                        Vider
                      </motion.button>
                      <Link href="/checkout" className="flex-1">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium text-center"
                        >
                          Commander
                        </motion.div>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            📑 ONGLETS
        ============================================================ */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Aperçu', icon: Home, badge: 0 },
            { id: 'journey', label: 'Parcours', icon: Target, badge: currentStep ? 1 : 0 },
            { id: 'orders', label: 'Commandes', icon: Package, badge: orders.filter(o => o.status === 'pending').length },
            { id: 'cart', label: 'Panier', icon: ShoppingCart, badge: getCartItemCount() },
            { id: 'favorites', label: 'Favoris', icon: Heart, badge: favorites.length },
          ].map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 py-3 font-medium text-sm transition whitespace-nowrap flex items-center gap-2 ${
                  active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.badge}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* ============================================================
            CONTENU - APERÇU
        ============================================================ */}
        {activeTab === 'overview' && (
          <>
            {/* Recommandations contextuelles (parcours en priorité) */}
            <section className="mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl" />
                </div>
                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {journeyProducts.length > 0 ? (
                        <><Target className="w-5 h-5" />Sélection pour ton parcours</>
                      ) : (
                        <><Sparkles className="w-5 h-5" />Sélection du moment</>
                      )}
                    </h2>
                    <p className="text-sm opacity-90 mt-1">
                      {journeyProducts.length > 0
                        ? currentStep
                          ? `Recommandé pour l'étape "${currentStep.title}"`
                          : 'Produits alignés à ton objectif'
                        : 'Découvrez nos produits les plus populaires'}
                    </p>
                  </div>
                  <Link href="/products">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 transition text-sm font-medium flex items-center gap-2"
                    >
                      Voir tout <ArrowUpRight className="w-4 h-4" />
                    </motion.div>
                  </Link>
                </div>
              </motion.div>

              {filteredRecommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredRecommendations.slice(0, 4).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -8 }}
                      onClick={() => router.push(`/product/${product.slug}`)}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                    >
                      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        <img
                          src={product.image || '/images/placeholder.png'}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                        />
                        {product.is_new && (
                          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg shadow-lg">
                            ✨ Nouveau
                          </span>
                        )}
                        {product.compare_price && (
                          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg shadow-lg animate-pulse">
                            -{Math.round((1 - product.price / product.compare_price) * 100)}%
                          </span>
                        )}
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition">
                          <div className="p-2 bg-white rounded-full shadow-lg">
                            <Heart className="w-4 h-4 text-red-500" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition">{product.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[40px]">
                          {stripHtml(product.description || '')}
                        </p>
                        {product.reason && (
                          <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-2 inline-flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            {product.reason}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div>
                            {product.compare_price && (
                              <span className="text-xs text-gray-400 line-through mr-2">
                                {product.compare_price.toLocaleString()} F
                              </span>
                            )}
                            <span className="font-bold text-indigo-600">
                              {product.price.toLocaleString()} F
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-gray-600 font-medium">{product.avg_rating || 0}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-600">Aucune recommandation pour le moment</h3>
                  <p className="text-gray-400 mt-1">Découvrez notre catalogue pour trouver des produits</p>
                  <Link
                    href="/products"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium"
                  >
                    Explorer le catalogue <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </section>

            {/* Favoris + Activités */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Favoris récents
                  </h2>
                  <button onClick={() => setActiveTab('favorites')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                    Tout voir <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {favorites.length > 0 ? (
                  <div className="space-y-2">
                    {favorites.slice(0, 3).map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ x: 4 }}
                        onClick={() => router.push(`/product/${product.slug}`)}
                        className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-red-200 transition cursor-pointer group"
                      >
                        <img
                          src={product.image || '/images/placeholder.png'}
                          alt={product.title}
                          className="w-14 h-14 object-cover rounded-xl"
                          onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition">{product.title}</p>
                          <p className="text-sm text-indigo-600 font-bold">{product.price.toLocaleString()} FCFA</p>
                        </div>
                        <motion.div whileHover={{ scale: 1.2 }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <Heart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Aucun favori</p>
                    <Link href="/products" className="text-sm text-indigo-600 hover:underline font-medium mt-2 inline-block">
                      Découvrir des produits →
                    </Link>
                  </div>
                )}
              </motion.section>

              <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-bold text-gray-900">Activités récentes</h2>
                </div>
                {activities.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                    {activities.slice(0, 5).map((activity, idx) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          {getActivityIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">
                            {activity.action_type === 'view' && `Consulté "${activity.product_title || 'un produit'}"`}
                            {activity.action_type === 'purchase' && `Acheté "${activity.product_title || 'un produit'}"`}
                            {activity.action_type === 'favorite_add' && `Ajouté "${activity.product_title || 'un produit'}" aux favoris`}
                            {activity.action_type === 'cart_add' && `Ajouté "${activity.product_title || 'un produit'}" au panier`}
                          </p>
                          <span className="text-xs text-gray-400">{formatDate(activity.created_at)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Aucune activité</p>
                  </div>
                )}
              </motion.section>
            </div>
          </>
        )}

        {/* ============================================================
            CONTENU - PARCOURS
        ============================================================ */}
        {activeTab === 'journey' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-600" />
                Mon parcours
              </h2>
              {activeJourney && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                    {activeJourney.progress_percent || 0}% complété
                  </span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
                    Étape {activeJourney.current_step}/{activeJourney.total_steps}
                  </span>
                </div>
              )}
            </div>

            {!activeGoal ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Aucun parcours actif</h3>
                <p className="text-gray-400 mt-1">
                  Réponds à la question du matin pour démarrer ton parcours personnalisé.
                </p>
              </div>
            ) : (
              <>
                {/* Objectif rappelé */}
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white mb-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <Target className="w-6 h-6 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs opacity-80 uppercase tracking-wide mb-1">Objectif actif</p>
                      <p className="font-bold text-lg">
                        {activeGoal.clarified_text || activeGoal.raw_text}
                      </p>
                      <p className="text-xs opacity-80 mt-1">
                        Catégorie : {activeGoal.category}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline des étapes */}
                <div className="space-y-3">
                  {journeySteps.map((step, idx) => {
                    const isDone = step.status === 'completed'
                    const isCurrent = step.status === 'available' || step.status === 'in_progress'
                    const isLocked = step.status === 'locked'

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-2xl border p-4 transition ${
                          isDone
                            ? 'bg-emerald-50 border-emerald-200'
                            : isCurrent
                              ? 'bg-indigo-50 border-indigo-300 shadow-lg'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-300 text-gray-600'
                          }`}>
                            {isDone ? <Check className="w-5 h-5" /> : step.step_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-bold ${isDone ? 'text-emerald-900' : isCurrent ? 'text-indigo-900' : 'text-gray-700'}`}>
                                {step.title}
                              </h3>
                              {isCurrent && (
                                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-indigo-600 text-white rounded-full font-bold">
                                  En cours
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-emerald-600 text-white rounded-full font-bold">
                                  Terminé
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                            {isCurrent && (
                              <div className="mt-3 bg-white rounded-xl p-3 border border-indigo-100">
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide mb-1">
                                  Mission du jour
                                </p>
                                <p className="text-sm text-gray-800">{step.mission_text}</p>
                                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                    ⏱️ ~{step.estimated_minutes} min
                                  </span>
                                  {step.success_criteria && (
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                                      🎯 {step.success_criteria}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Produits liés au parcours */}
                {journeyProducts.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-purple-500" />
                      Produits recommandés pour ton parcours
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {journeyProducts.slice(0, 4).map((product, idx) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -4 }}
                          onClick={() => router.push(`/product/${product.slug}`)}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition cursor-pointer"
                        >
                          <div className="h-32 bg-gray-100 overflow-hidden">
                            <img
                              src={product.image || '/images/placeholder.png'}
                              alt={product.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                            />
                          </div>
                          <div className="p-3">
                            <p className="font-medium text-sm text-gray-900 truncate">{product.title}</p>
                            {product.reason && (
                              <p className="text-[10px] text-purple-600 mt-1 line-clamp-2">{product.reason}</p>
                            )}
                            <p className="font-bold text-indigo-600 text-sm mt-2">
                              {product.price.toLocaleString()} F
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.section>
        )}

        {/* ============================================================
            CONTENU - COMMANDES
        ============================================================ */}
        {activeTab === 'orders' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-600" />
                Mes commandes
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-yellow-600">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  {orders.filter(o => o.status === 'pending').length} en attente
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  {orders.filter(o => o.status === 'completed').length} terminées
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Aucune commande</h3>
                <p className="text-gray-400 mt-1">Vous n'avez pas encore passé de commande.</p>
                <Link href="/products" className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium">
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, idx) => {
                  const products = order.products || []
                  const firstProduct = products[0] || { title: order.product_title || 'Produit' }
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.005, boxShadow: '0 10px 40px -10px rgba(79, 70, 229, 0.2)' }}
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-200 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                            <Package className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{firstProduct.title || 'Produit'}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500 font-mono">#{order.order_number}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
                              {getStatusBadge(order.status)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-indigo-600 text-lg">{order.total.toLocaleString()} F</span>

                          {order.status === 'completed' && order.download_url ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDownload(order.id, order.download_url!, firstProduct.title)}
                              disabled={downloading === order.id}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition text-sm font-medium disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                            >
                              {downloading === order.id ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />En cours...</>
                              ) : (
                                <><Download className="w-4 h-4" />Télécharger</>
                              )}
                            </motion.button>
                          ) : null}

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setSelectedOrder(order); setShowOrderModal(true) }}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition rounded-xl hover:bg-indigo-50"
                          >
                            <Eye className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.section>
        )}

        {/* ============================================================
            CONTENU - PANIER
        ============================================================ */}
        {activeTab === 'cart' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-indigo-600" />
                Mon panier
              </h2>
              <span className="text-sm text-gray-500">{getCartItemCount()} article(s)</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Votre panier est vide</h3>
                <Link href="/products" className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium">
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="space-y-3">
                  {cartItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <img
                        src={item.image || '/images/placeholder.png'}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-xl"
                        onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-indigo-600 font-bold">{item.price.toLocaleString()} FCFA</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateCartQuantity(item.product_id, Math.max(1, item.quantity - 1))} className="p-2 bg-white border rounded-lg">
                          <Minus className="w-4 h-4" />
                        </motion.button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} className="p-2 bg-white border rounded-lg">
                          <PlusIcon className="w-4 h-4" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(item.product_id)} className="p-2 bg-red-50 border border-red-200 rounded-lg ml-2">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {getCartTotal().toLocaleString()} F
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={clearCart} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium">
                      Vider
                    </motion.button>
                    <Link href="/checkout" className="flex-1">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition font-medium text-center shadow-indigo-500/30">
                        Procéder au paiement →
                      </motion.div>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* ============================================================
            CONTENU - FAVORIS
        ============================================================ */}
        {activeTab === 'favorites' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-500" />
                Mes favoris
              </h2>
              <span className="text-sm text-gray-500">{favorites.length} produit(s)</span>
            </div>

            {favorites.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Aucun favori</h3>
                <Link href="/products" className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium">
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -6 }}
                    onClick={() => router.push(`/product/${product.slug}`)}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition cursor-pointer group"
                  >
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation() }}
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full hover:bg-red-50 transition"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </motion.button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition">{product.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{stripHtml(product.description || '')}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="font-bold text-indigo-600">{product.price.toLocaleString()} F</span>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          {product.avg_rating || 0}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* ============================================================
            FOOTER UTILISATEUR
        ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-gray-500">Connecté en tant que</p>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Package className="w-4 h-4" />{stats?.total_purchases || 0}</span>
              <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-red-400" />{stats?.total_favorites || 0}</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400" />{stats?.total_reviews || 0}</span>
              <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-500" />{unlockedBadges} badges</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/settings" className="text-sm text-gray-500 hover:text-indigo-600 transition font-medium flex items-center gap-1">
                <Settings className="w-4 h-4" />Paramètres
              </Link>
              <button onClick={logout} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                <LogOut className="w-4 h-4" />Déconnexion
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ============================================================
          MODAL DÉTAILS COMMANDE
      ============================================================ */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Commande #{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <motion.button whileHover={{ rotate: 90 }} onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {getStatusBadge(selectedOrder.status)}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {selectedOrder.payment_status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                </span>
              </div>

              {selectedOrder.products && selectedOrder.products.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Articles</h3>
                  <div className="space-y-2">
                    {selectedOrder.products.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500">× {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-900">{item.total.toLocaleString()} FCFA</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-indigo-600">{selectedOrder.total.toLocaleString()} FCFA</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}