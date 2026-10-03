// app/admin/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  Package,
  Clock,
  ArrowUp,
  ArrowDown,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  Award,
  Target,
  Globe,
  CreditCard,
  Truck,
  Sparkles,
  BarChart,
  PieChart,
  Activity,
  UserPlus,
  Archive,
  Layers,
  Tag,
  Gift,
  Mail,
  MapPin,
  Clock as ClockIcon,
  UserCheck,
  UserX,
  Shield,
  Edit2,
  Trash2,
  Layout,
  Star,
  FileText, 
  Image as ImageIcon,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface Stats {
  revenue: number
  orders: number
  customers: number
  conversion: number
}

interface Product {
  id: string
  title: string
  category: string
  sales: number
  revenue: number
}

interface Order {
  id: string
  orderNumber: string
  userName: string
  amount: number
  status: 'completed' | 'pending' | 'refunded'
  createdAt: string
}

interface Activity {
  id: string
  action: string
  createdAt: string
}

interface ChartData {
  month: string
  revenue: number
  orders: number
}

interface MenuItem {
  icon: React.ElementType
  label: string
  href?: string
  children?: MenuItem[]
  active?: boolean
}

// ============================================================
// Types de réponses API
// ============================================================
interface AdminMeResponse {
  authenticated?: boolean
  admin?: {
    name?: string
  }
}

interface StatsResponse {
  data?: Stats
  revenue?: number
  orders?: number
  customers?: number
  conversion?: number
}

interface TopProductsResponse {
  products?: Product[]
}

interface RecentOrdersResponse {
  orders?: Order[]
}

interface ActivitiesResponse {
  activities?: Activity[]
}

// ============================================================
// COMPOSANT NOTIFICATION PANEL
// ============================================================

function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const notifications = [
    { id: 1, title: 'Nouvelle commande', message: 'Commande #1234 de Jean Dupont', time: 'Il y a 5 min', read: false },
    { id: 2, title: 'Stock faible', message: 'Le produit "Casque Audio" est presque épuisé', time: 'Il y a 1h', read: false },
    { id: 3, title: 'Paiement reçu', message: 'Paiement de 150 000 FCFA confirmé', time: 'Il y a 3h', read: true },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="notification-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="notification-panel"
          >
            <div className="notification-header">
              <h3>Notifications</h3>
              <button onClick={onClose} className="close-notif">
                <X size={20} />
              </button>
            </div>
            <div className="notification-list">
              {notifications.map((notif) => (
                <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                  <div className="notif-dot" />
                  <div className="notif-content">
                    <p className="notif-title">{notif.title}</p>
                    <p className="notif-message">{notif.message}</p>
                    <span className="notif-time">{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('Admin')
  const [userInitial, setUserInitial] = useState('A')
  const [openMenus, setOpenMenus] = useState<string[]>([])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  // ============================================================
  // VÉRIFICATION DE LA SESSION ADMIN (via cookie admin_session)
  // ============================================================

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) {
          router.replace('/admin/login')
          return
        }

        const data = (await res.json()) as AdminMeResponse
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }

        // Admin authentifié – récupérer les infos
        if (data.admin) {
          setUserName(data.admin.name || 'Admin')
          setUserInitial((data.admin.name || 'A').charAt(0).toUpperCase())
        }

        // Charger les données du dashboard
        await fetchDashboardData()
      } catch (err) {
        console.error('Erreur vérification admin:', err)
        router.replace('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // CHARGEMENT DES DONNÉES DU DASHBOARD
  // ============================================================

  const fetchDashboardData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setIsRefreshing(true)
        setError(null)

        const [statsRes, productsRes, ordersRes, activitiesRes] = await Promise.all([
          fetch(`/api/admin/stats?period=${selectedPeriod}`, { credentials: 'include' }),
          fetch('/api/admin/products/top?limit=5', { credentials: 'include' }),
          fetch('/api/admin/orders/recent?limit=5', { credentials: 'include' }),
          fetch('/api/admin/activities?limit=10', { credentials: 'include' }),
        ])

        // Statistiques
        if (statsRes.ok) {
          const data = (await statsRes.json()) as StatsResponse

          if (data.data) {
            setStats(data.data)
          } else {
            setStats({
              revenue: data.revenue ?? 0,
              orders: data.orders ?? 0,
              customers: data.customers ?? 0,
              conversion: data.conversion ?? 0,
            })
          }
        } else {
          console.warn('Impossible de récupérer les stats:', statsRes.status)
          if (statsRes.status === 401) {
            router.push('/admin/login')
            return
          }
        }

        // Top produits
        if (productsRes.ok) {
          const data = (await productsRes.json()) as TopProductsResponse
          setTopProducts(data.products || [])
        } else {
          console.warn('Impossible de récupérer les produits:', productsRes.status)
          setTopProducts([])
        }

        // Commandes récentes
        if (ordersRes.ok) {
          const data = (await ordersRes.json()) as RecentOrdersResponse
          setRecentOrders(data.orders || [])
        } else {
          console.warn('Impossible de récupérer les commandes:', ordersRes.status)
          setRecentOrders([])
        }

        // Activités récentes
        if (activitiesRes.ok) {
          const data = (await activitiesRes.json()) as ActivitiesResponse
          setActivities(data.activities || [])
        } else {
          console.warn('Impossible de récupérer les activités:', activitiesRes.status)
          setActivities([])
        }

        // Générer les données du graphique si les stats sont disponibles
        if (stats) {
          generateChartDataFromStats(stats)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [router, selectedPeriod]
  )

  // ============================================================
  // GÉNÉRATION DES DONNÉES DU GRAPHIQUE (mock)
  // ============================================================

  const generateChartDataFromStats = (stats: Stats) => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const revenuePerMonth = stats.revenue / 12
    const ordersPerMonth = stats.orders / 12

    const data = months.map((month, index) => {
      const seasonalFactor = 1 + 0.3 * Math.sin((index - 2) * 0.5)
      const randomFactor = 0.8 + Math.random() * 0.4
      return {
        month,
        revenue: Math.round(revenuePerMonth * seasonalFactor * randomFactor),
        orders: Math.round(ordersPerMonth * seasonalFactor * randomFactor),
      }
    })
    setChartData(data)
  }

  // ============================================================
  // MENU DE NAVIGATION
  // ============================================================

  const menuItems: MenuItem[] = [
    { icon: BarChart, label: 'Dashboard', href: '/admin', active: true },
    {
      icon: Package,
      label: 'Catalogue',
      children: [
        { icon: Package, label: 'Tous les produits', href: '/admin/products' },
        { icon: Tag, label: 'Catégories', href: '/admin/categories' },
        { icon: Archive, label: 'Stock', href: '/admin/stock' },
        { icon: Star, label: 'Avis et notes', href: '/admin/reviews' },
        { icon: FileText, label: 'Import/Export CSV', href: '/admin/products/import-export' },
      ],
    },
    {
      icon: ShoppingBag,
      label: 'Commandes',
      children: [
        { icon: ShoppingBag, label: 'Toutes les commandes', href: '/admin/orders' },
        { icon: Truck, label: 'Suivi livraison', href: '/admin/orders/tracking' },
        { icon: RefreshCw, label: 'Retours & remboursements', href: '/admin/returns' },
        { icon: FileText, label: 'Factures', href: '/admin/invoices' },
      ],
    },
    {
      icon: Users,
      label: 'Utilisateurs',
      children: [
        { icon: Users, label: 'Tous les utilisateurs', href: '/admin/users' },
        { icon: UserPlus, label: 'Rôles & permissions', href: '/admin/roles' },
        { icon: Shield, label: 'Bannissement / Suspension', href: '/admin/security/users' },
        { icon: Mail, label: 'Newsletter', href: '/admin/newsletter' },
        { icon: Globe, label: 'Analyse géographique', href: '/admin/analytics/geo' },
      ],
    },
    {
      icon: Activity,
      label: 'Marketing',
      children: [
        { icon: Gift, label: 'Codes promo', href: '/admin/promotions' },
        { icon: Award, label: 'Programme de fidélité', href: '/admin/loyalty' },
        { icon: Mail, label: 'Campagnes email', href: '/admin/email-campaigns' },
        { icon: Zap, label: 'A/B Testing', href: '/admin/ab-testing' },
        { icon: Bell, label: 'Notifications push', href: '/admin/push-notifications' },
      ],
    },
    {
      icon: TrendingUp,
      label: 'Analytique',
      children: [
        { icon: PieChart, label: 'Statistiques avancées', href: '/admin/analytics' },
        { icon: Users, label: 'Cohortes utilisateurs', href: '/admin/cohorts' },
        { icon: Activity, label: 'Heatmap d\'activité', href: '/admin/heatmap' },
        { icon: Target, label: 'Tendances et projections', href: '/admin/trends' },
      ],
    },
    {
      icon: Layers,
      label: 'Contenu & SEO',
      children: [
        { icon: FileText, label: 'Pages statiques', href: '/admin/pages' },
        { icon: Globe, label: 'Méta-données', href: '/admin/seo' },
        { icon: MapPin, label: 'Sitemap', href: '/admin/sitemap' },
        { icon: Search, label: 'Analyse mots-clés', href: '/admin/keywords' },
      ],
    },
    {
      icon: Shield,
      label: 'Sécurité',
      children: [
        { icon: Shield, label: '2FA administrateur', href: '/admin/security/2fa' },
        { icon: Clock, label: 'Journal des accès', href: '/admin/security/logs' },
        { icon: Download, label: 'Sauvegarde automatique', href: '/admin/security/backup' },
        { icon: FileText, label: 'Conformité RGPD', href: '/admin/gdpr' },
      ],
    },
    {
      icon: CreditCard,
      label: 'Intégrations',
      children: [
        { icon: CreditCard, label: 'Paiements (Stripe, PayPal)', href: '/admin/integrations/payments' },
        { icon: BarChart, label: 'Analytics externes', href: '/admin/integrations/analytics' },
        { icon: Users, label: 'CRM (HubSpot, Salesforce)', href: '/admin/integrations/crm' },
      ],
    },
    {
      icon: Layers,
      label: 'Vitrine',
      children: [
        { icon: Layout, label: 'Campagnes', href: '/admin/campaigns' },
        { icon: Gift, label: 'Promotions', href: '/admin/promotions' },
        { icon: Package, label: 'Collections', href: '/admin/collections' },
        { icon: FileText, label: 'Sections', href: '/admin/sections' },
      ],
    },
    { icon: Settings, label: 'Paramètres', href: '/admin/settings' },
  ]

  // ============================================================
  // FILTRES ET RECHERCHE
  // ============================================================

  const filteredMenuItems = searchQuery
    ? menuItems.filter((item) => {
        if (item.label.toLowerCase().includes(searchQuery.toLowerCase())) return true
        if (item.children) {
          return item.children.some((child) =>
            child.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }
        return false
      })
    : menuItems

  // ============================================================
  // UTILITAIRES D'AFFICHAGE
  // ============================================================

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-50'
      case 'pending':
        return 'text-yellow-500 bg-yellow-50'
      case 'refunded':
        return 'text-red-500 bg-red-50'
      default:
        return 'text-gray-500 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complétée'
      case 'pending':
        return 'En attente'
      case 'refunded':
        return 'Remboursée'
      default:
        return status
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <UserCheck size={14} />
      case 'logout':
        return <LogOut size={14} />
      case 'create_product':
        return <Package size={14} />
      case 'update_product':
        return <Edit2 size={14} />
      case 'delete_product':
        return <Trash2 size={14} />
      case 'update_user':
        return <Users size={14} />
      case 'delete_user':
        return <UserX size={14} />
      default:
        return <Activity size={14} />
    }
  }

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1)
  const maxOrders = Math.max(...chartData.map((d) => d.orders), 1)

  // ============================================================
  // DÉCONNEXION ADMIN
  // ============================================================

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    } catch (e) {
      console.error('Erreur déconnexion:', e)
    }
    router.push('/admin/login')
  }

  // ============================================================
  // RENDU
  // ============================================================

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Chargement du tableau de bord...</p>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f0f4ff;
            gap: 16px;
          }
          .loader {
            width: 48px;
            height: 48px;
            border: 4px solid #e2e8f0;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          .loading-screen p {
            color: #64748b;
            font-size: 16px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Image src="/torrent.png" alt="TorrentTwist" width={40} height={40} className="logo-image" />
            </div>
            <div>
              <span className="logo-text">TorrentTwist</span>
              <span className="logo-badge">Admin</span>
            </div>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">Administrateur</span>
          </div>
        </div>

        <div className="sidebar-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="sidebar-nav">
          {filteredMenuItems.map((item) => {
            if (item.children) {
              const isOpen = openMenus.includes(item.label)
              return (
                <div key={item.label}>
                  <button className="sidebar-link" onClick={() => toggleMenu(item.label)}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    <ChevronDown
                      size={16}
                      className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pl-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <a
                          key={child.href}
                          href={child.href}
                          className="sidebar-link text-sm"
                          onClick={(e) => {
                            e.preventDefault()
                            router.push(child.href!)
                            setMobileMenuOpen(false)
                          }}
                        >
                          <child.icon size={16} />
                          <span>{child.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <a
                key={item.label}
                href={item.href}
                className={`sidebar-link ${item.active ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(item.href!)
                  setMobileMenuOpen(false)
                }}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.active && <span className="active-indicator" />}
              </a>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link logout" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="admin-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h1>Dashboard</h1>
              <p className="header-subtitle">Vue d'ensemble de TorrentTwist</p>
            </div>
          </div>

          <div className="header-right">
            <div className="search-bar">
              <Search size={18} />
              <input type="text" placeholder="Rechercher..." />
              <kbd>⌘K</kbd>
            </div>

            <button className="notif-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              <span className="notif-badge">3</span>
            </button>

            <button className="ai-btn">
              <Sparkles size={18} />
              <span>IA</span>
            </button>

            <div className="period-selector">
              <button
                className={`period-btn ${selectedPeriod === 'today' ? 'active' : ''}`}
                onClick={() => setSelectedPeriod('today')}
              >
                Aujourd'hui
              </button>
              <button
                className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
                onClick={() => setSelectedPeriod('week')}
              >
                Semaine
              </button>
              <button
                className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
                onClick={() => setSelectedPeriod('month')}
              >
                Mois
              </button>
            </div>

            <button
              className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => fetchDashboardData()}>Réessayer</button>
          </div>
        )}

        <section className="stats-grid">
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon revenue">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.revenue?.toLocaleString() || 0} FCFA</span>
              <span className="stat-label">Revenus</span>
              <span className="stat-change positive">
                <ArrowUp size={14} />
                +12.5%
              </span>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon orders">
              <ShoppingBag size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.orders || 0}</span>
              <span className="stat-label">Commandes</span>
              <span className="stat-change positive">
                <ArrowUp size={14} />
                +8.2%
              </span>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon customers">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.customers || 0}</span>
              <span className="stat-label">Acheteurs</span>
              <span className="stat-change positive">
                <ArrowUp size={14} />
                +5.3%
              </span>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="stat-icon conversion">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.conversion || 0}%</span>
              <span className="stat-label">Conversion</span>
              <span className="stat-change negative">
                <ArrowDown size={14} />
                -1.2%
              </span>
            </div>
          </motion.div>
        </section>

        <div className="middle-section">
          <section className="chart-section">
            <div className="section-header">
              <div className="section-title">
                <BarChart size={20} />
                <h2>Performance</h2>
              </div>
              <div className="section-actions">
                <button className="action-btn">
                  <Download size={16} />
                  Exporter
                </button>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-color revenue-color"></span>
                  Revenus (FCFA)
                </span>
                <span className="legend-item">
                  <span className="legend-color orders-color"></span>
                  Commandes
                </span>
              </div>
              <div className="chart-bars">
                {chartData.length > 0 ? (
                  chartData.map((data, index) => {
                    const revenueHeight = (data.revenue / maxRevenue) * 100
                    const ordersHeight = (data.orders / maxOrders) * 100
                    return (
                      <div key={index} className="chart-bar-group">
                        <div className="chart-bars-container">
                          <div
                            className="chart-bar revenue-bar"
                            style={{ height: `${Math.max(revenueHeight, 5)}%` }}
                          >
                            <span className="bar-value">{data.revenue.toLocaleString()}</span>
                          </div>
                          <div
                            className="chart-bar orders-bar"
                            style={{ height: `${Math.max(ordersHeight, 5)}%` }}
                          >
                            <span className="bar-value">{data.orders}</span>
                          </div>
                        </div>
                        <span className="bar-label">{data.month}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="chart-empty">
                    <p>Aucune donnée disponible</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="top-products">
            <div className="section-header">
              <div className="section-title">
                <TrendingUp size={20} />
                <h2>Top produits</h2>
              </div>
              <a href="/admin/products" className="view-all">
                Voir tout
                <ChevronRight size={16} />
              </a>
            </div>

            <div className="products-list">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product.id} className="product-item">
                    <div className="product-rank">{index + 1}</div>
                    <div className="product-info">
                      <h4>{product.title}</h4>
                      <span className="product-category">{product.category}</span>
                    </div>
                    <div className="product-stats">
                      <span className="product-sales">{product.sales || 0} ventes</span>
                      <span className="product-revenue">{product.revenue?.toLocaleString() || 0} FCFA</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Package size={32} />
                  <p>Aucun produit</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="bottom-section">
          <section className="recent-orders">
            <div className="section-header">
              <div className="section-title">
                <ClockIcon size={20} />
                <h2>Commandes récentes</h2>
              </div>
              <a href="/admin/orders" className="view-all">
                Voir tout
                <ChevronRight size={16} />
              </a>
            </div>

            <div className="orders-list">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="order-item">
                    <div className="order-info">
                      <span className="order-id">#{order.orderNumber}</span>
                      <span className="order-customer">{order.userName}</span>
                    </div>
                    <div className="order-details">
                      <span className="order-amount">{order.amount.toLocaleString()} FCFA</span>
                      <span className={`order-status ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <ShoppingBag size={32} />
                  <p>Aucune commande</p>
                </div>
              )}
            </div>
          </section>

          <section className="recent-activity">
            <div className="section-header">
              <div className="section-title">
                <Activity size={20} />
                <h2>Activités récentes</h2>
              </div>
            </div>

            <div className="activity-list">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">{getActionIcon(activity.action)}</div>
                    <div className="activity-content">
                      <p className="activity-text">{activity.action}</p>
                      <span className="activity-time">
                        {new Date(activity.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Activity size={32} />
                  <p>Aucune activité</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      <style jsx>{`
        .admin-dashboard {
          display: flex;
          min-height: 100vh;
          background: #f0f4ff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .sidebar {
          width: 280px;
          background: #0f172a;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          flex-shrink: 0;
          z-index: 50;
          border-right: 1px solid rgba(255, 255, 255, 0.04);
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #1e293b;
          flex-shrink: 0;
        }

        .logo-image {
          object-fit: contain;
          width: 100%;
          height: 100%;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
        }

        .logo-badge {
          font-size: 10px;
          padding: 2px 8px;
          background: #2563eb;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          display: block;
          margin-top: 2px;
        }

        .mobile-close {
          display: none;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
          flex-shrink: 0;
        }

        .user-name {
          display: block;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .user-role {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .sidebar-search {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          margin: 12px 0;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.3);
        }

        .sidebar-search input {
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 13px;
          flex: 1;
        }

        .sidebar-search input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .sidebar-nav {
          flex: 1;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 3px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        .sidebar-link:hover {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.8);
        }

        .sidebar-link.active {
          background: rgba(37, 99, 235, 0.1);
          color: #2563eb;
        }

        .active-indicator {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: #2563eb;
          border-radius: 3px;
        }

        .sidebar-link.logout {
          color: rgba(239, 68, 68, 0.6);
        }

        .sidebar-link.logout:hover {
          background: rgba(239, 68, 68, 0.04);
          color: #ef4444;
        }

        .sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 16px;
        }

        .main-content {
          flex: 1;
          padding: 24px 32px 40px;
          overflow-y: auto;
          min-height: 100vh;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #1a1a2e;
          padding: 4px;
        }

        .admin-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }

        .header-subtitle {
          color: #94a3b8;
          margin: 0;
          font-size: 14px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          min-width: 200px;
          transition: all 0.3s ease;
        }

        .search-bar:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.04);
        }

        .search-bar input {
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          flex: 1;
          color: #1a1a2e;
        }

        .search-bar kbd {
          font-size: 11px;
          padding: 2px 6px;
          background: #f1f5f9;
          border-radius: 4px;
          color: #94a3b8;
        }

        .notif-btn {
          position: relative;
          padding: 8px;
          border: none;
          background: none;
          cursor: pointer;
          color: #1a1a2e;
          border-radius: 8px;
          transition: background 0.3s ease;
        }

        .notif-btn:hover {
          background: #f1f5f9;
        }

        .notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 18px;
          height: 18px;
          background: #ef4444;
          border-radius: 50%;
          font-size: 10px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ai-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.2);
        }

        .period-selector {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #f1f5f9;
          border-radius: 8px;
        }

        .period-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .period-btn:hover {
          color: #1a1a2e;
        }

        .period-btn.active {
          background: white;
          color: #1a1a2e;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .refresh-btn {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          color: #64748b;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .refresh-btn:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
        }

        .refresh-btn.spinning svg {
          animation: spin 0.8s linear infinite;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          margin-bottom: 20px;
        }

        .error-banner button {
          margin-left: auto;
          padding: 4px 12px;
          background: #dc2626;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.3s ease;
        }

        .error-banner button:hover {
          background: #b91c1c;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          cursor: default;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon.revenue {
          background: #eff6ff;
          color: #2563eb;
        }
        .stat-icon.orders {
          background: #dcfce7;
          color: #22c55e;
        }
        .stat-icon.customers {
          background: #f3e8ff;
          color: #8b5cf6;
        }
        .stat-icon.conversion {
          background: #fef3c7;
          color: #f59e0b;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1a1a2e;
        }

        .stat-label {
          font-size: 13px;
          color: #94a3b8;
        }

        .stat-change {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }

        .stat-change.positive {
          color: #22c55e;
        }
        .stat-change.negative {
          color: #ef4444;
        }

        .middle-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title svg {
          color: #2563eb;
        }

        .section-title h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #2563eb;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .view-all:hover {
          color: #1d4ed8;
        }

        .section-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-btn:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .chart-section {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid #e2e8f0;
        }

        .chart-container {
          height: 220px;
          padding: 8px 0;
        }

        .chart-legend {
          display: flex;
          gap: 20px;
          margin-bottom: 12px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .legend-color.revenue-color {
          background: linear-gradient(180deg, #2563eb, #6366f1);
        }

        .legend-color.orders-color {
          background: linear-gradient(180deg, #22c55e, #4ade80);
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: calc(100% - 30px);
          gap: 8px;
        }

        .chart-bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          height: 100%;
        }

        .chart-bars-container {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 100%;
          width: 100%;
          justify-content: center;
        }

        .chart-bar {
          width: 40%;
          max-width: 24px;
          border-radius: 4px 4px 0 0;
          min-height: 8px;
          position: relative;
          transition: height 0.5s ease;
        }

        .chart-bar.revenue-bar {
          background: linear-gradient(180deg, #2563eb, #6366f1);
        }

        .chart-bar.orders-bar {
          background: linear-gradient(180deg, #22c55e, #4ade80);
        }

        .bar-value {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 8px;
          color: #64748b;
          white-space: nowrap;
        }

        .bar-label {
          font-size: 10px;
          color: #94a3b8;
        }

        .chart-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
          font-size: 14px;
        }

        .top-products {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid #e2e8f0;
        }

        .products-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          transition: background 0.3s ease;
        }

        .product-item:hover {
          background: #f8fafc;
        }

        .product-rank {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          flex-shrink: 0;
        }

        .product-info {
          flex: 1;
          min-width: 0;
        }

        .product-info h4 {
          font-size: 14px;
          font-weight: 500;
          color: #1a1a2e;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-category {
          font-size: 12px;
          color: #94a3b8;
        }

        .product-stats {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .product-sales {
          font-size: 12px;
          color: #64748b;
        }

        .product-revenue {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .bottom-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .recent-orders,
        .recent-activity {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid #e2e8f0;
        }

        .orders-list,
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          transition: background 0.3s ease;
          flex-wrap: wrap;
          gap: 8px;
        }

        .order-item:hover {
          background: #f8fafc;
        }

        .order-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .order-id {
          font-weight: 600;
          color: #1a1a2e;
          font-size: 13px;
        }

        .order-customer {
          color: #64748b;
          font-size: 13px;
        }

        .order-details {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .order-amount {
          font-weight: 600;
          color: #1a1a2e;
          font-size: 13px;
        }

        .order-status {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 12px;
          text-transform: capitalize;
        }

        .order-date {
          font-size: 12px;
          color: #94a3b8;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.3s ease;
        }

        .activity-item:hover {
          background: #f8fafc;
        }

        .activity-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .activity-text {
          font-size: 13px;
          color: #1a1a2e;
          margin: 0;
        }

        .activity-time {
          font-size: 12px;
          color: #94a3b8;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          color: #94a3b8;
          gap: 8px;
        }

        .empty-state svg {
          color: #e2e8f0;
        }

        .empty-state p {
          font-size: 14px;
          margin: 0;
        }

        .notification-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .notification-panel {
          position: fixed;
          top: 80px;
          right: 20px;
          width: 380px;
          max-height: 500px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          z-index: 101;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .notification-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
        }

        .close-notif {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .close-notif:hover {
          background: #f1f5f9;
          color: #1a1a2e;
        }

        .notification-list {
          overflow-y: auto;
          padding: 8px 0;
          max-height: 400px;
        }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          transition: background 0.3s ease;
          border-left: 3px solid transparent;
        }

        .notification-item:hover {
          background: #f8fafc;
        }

        .notification-item.unread {
          border-left-color: #2563eb;
          background: #eff6ff;
        }

        .notification-item.unread:hover {
          background: #dbeafe;
        }

        .notif-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563eb;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .notification-item:not(.unread) .notif-dot {
          background: #e2e8f0;
        }

        .notif-content {
          flex: 1;
        }

        .notif-title {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0 0 2px 0;
        }

        .notif-message {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 4px 0;
        }

        .notif-time {
          font-size: 11px;
          color: #94a3b8;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 1024px) {
          .middle-section {
            grid-template-columns: 1fr;
          }
          .bottom-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            transform: translateX(-100%);
            width: 280px;
            height: 100vh;
            top: 0;
            left: 0;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-close {
            display: block;
          }

          .menu-toggle {
            display: block;
          }

          .main-content {
            padding: 16px;
          }

          .admin-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-left {
            justify-content: space-between;
          }

          .header-right {
            flex-wrap: wrap;
          }

          .search-bar {
            min-width: 100%;
          }

          .period-selector {
            flex: 1;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-value {
            font-size: 20px;
          }

          .order-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .order-details {
            width: 100%;
            justify-content: flex-start;
          }

          .notification-panel {
            width: calc(100% - 32px);
            right: 16px;
            top: 70px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .admin-header h1 {
            font-size: 22px;
          }

          .period-btn {
            font-size: 11px;
            padding: 4px 8px;
          }

          .ai-btn span {
            display: none;
          }

          .chart-container {
            height: 180px;
          }

          .product-item {
            flex-wrap: wrap;
          }

          .product-stats {
            flex-direction: row;
            gap: 12px;
            width: 100%;
            padding-left: 36px;
          }

          .chart-legend {
            flex-direction: column;
            gap: 4px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  )
}