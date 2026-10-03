// app/settings/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Bell,
  Shield,
  Moon,
  Sun,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Key,
  RefreshCw,
  Heart,
  Package,
  ShoppingBag,
  CreditCard,
  Gift,
  Sparkles,
  Zap,
  Crown,
  Flame,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings as SettingsIcon,
  LogOut,
  Palette,
  Languages,
  Clock,
  Smartphone,
  Laptop,
  Tablet,
  Users,
  Star,
  Award,
  TrendingUp
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface UserSettings {
  id: number
  name: string
  email: string
  phone: string | null
  bio: string | null
  address: string | null
  city: string | null
  country: string | null
  postal_code: string | null
  avatar: string | null
  language: string | null
  currency: string | null
  timezone: string | null
  email_notifications: number
  push_notifications: number
  whatsapp_notifications: number
  created_at: string
  updated_at: string
}

interface SettingsResponse {
  user: UserSettings
}

interface SettingsErrorResponse {
  error?: string
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function SettingsPage() {
  const router = useRouter()
  const {
    user,
    isAuthenticated,
    loading: userLoading,
    logout,
    refreshUser
  } = useUser()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================

  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/settings')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT DES PARAMÈTRES
  // ============================================================

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include',
      })

      if (response.status === 401) {
        router.push('/login?redirect=/settings')
        return
      }

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des paramètres')
      }

      const data = (await response.json()) as SettingsResponse

      setSettings(data.user)
      setError(null)
    } catch (error) {
      console.error('❌ Erreur chargement paramètres:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger vos paramètres.'
      )
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings()
    }
  }, [isAuthenticated, fetchSettings])

  // ============================================================
  // SAUVEGARDE DES PARAMÈTRES
  // ============================================================

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as SettingsErrorResponse
        throw new Error(
          errorData.error || 'Erreur lors de la sauvegarde'
        )
      }

      const data = (await response.json()) as SettingsResponse

      setSettings(data.user)
      setSuccess(true)
      setEditedFields(new Set())

      await refreshUser()

      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Impossible de sauvegarder les modifications.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // MISE À JOUR DES CHAMPS
  // ============================================================

  const updateField = <K extends keyof UserSettings>(
    field: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev =>
      prev ? { ...prev, [field]: value } : null
    )
    setEditedFields(prev => new Set(prev).add(field as string))
  }

  // ============================================================
  // SECTIONS
  // ============================================================

  const sections = [
    { id: 'profile', label: 'Profil', icon: User, color: 'blue' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'purple' },
    { id: 'preferences', label: 'Préférences', icon: SettingsIcon, color: 'green' },
    { id: 'security', label: 'Sécurité', icon: Shield, color: 'red' },
  ]

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const stats = [
    { icon: Package, label: 'Commandes', value: user?.orders_count || 0 },
    { icon: Heart, label: 'Favoris', value: user?.total_favorites || 0 },
    { icon: Star, label: 'Avis', value: user?.total_reviews || 0 },
    { icon: Award, label: 'Score', value: user?.engagement_score || 0 },
  ]

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <SettingsIcon className="w-12 h-12 text-blue-500 mx-auto" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">
            Chargement de vos paramètres...
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Préparation de votre espace
          </p>
        </div>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">
            Erreur de chargement
          </h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchSettings()
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
                  <SettingsIcon className="w-6 h-6 text-blue-500" />
                  Paramètres
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Gérez votre profil et vos préférences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={saving || editedFields.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </>
                )}
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-500" />
                )}
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
          CONTENU PRINCIPAL
      ============================================================ */}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ============================================================
              SIDEBAR
          ============================================================ */}

          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 sticky top-24">
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {settings?.avatar ? (
                        <img
                          src={settings.avatar}
                          alt={settings.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <button className="absolute bottom-0 right-0 p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition shadow-lg">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-gray-900 mt-3">{settings?.name}</h3>
                <p className="text-sm text-gray-500">{settings?.email}</p>
              </div>

              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <section.icon className={`w-5 h-5 ${
                      activeSection === section.id ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <span className="font-medium text-sm">{section.label}</span>
                    {editedFields.size > 0 && activeSection === section.id && (
                      <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Statistiques</p>
                <div className="grid grid-cols-2 gap-2">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-2 text-center">
                      <stat.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
              CONTENU
          ============================================================ */}

          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Paramètres sauvegardés avec succès !</span>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ============================================================
                  SECTION PROFIL - TEXTES NOIRS
              ============================================================ */}
              {activeSection === 'profile' && settings && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Informations personnelles
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={settings.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.email || ''}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={settings.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium placeholder:text-gray-400"
                        placeholder="+237 6XX XXX XXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={settings.bio || ''}
                        onChange={(e) => updateField('bio', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none text-gray-900 font-medium placeholder:text-gray-400"
                        rows={2}
                        placeholder="Parlez-nous de vous..."
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mt-4">
                    <MapPin className="w-5 h-5 text-green-500" />
                    Adresse
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse
                      </label>
                      <input
                        type="text"
                        value={settings.address || ''}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium placeholder:text-gray-400"
                        placeholder="Rue, numéro, bâtiment..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={settings.city || ''}
                        onChange={(e) => updateField('city', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pays
                      </label>
                      <input
                        type="text"
                        value={settings.country || ''}
                        onChange={(e) => updateField('country', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={settings.postal_code || ''}
                        onChange={(e) => updateField('postal_code', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  SECTION NOTIFICATIONS
              ============================================================ */}
              {activeSection === 'notifications' && settings && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-500" />
                    Notifications
                  </h2>

                  <p className="text-sm text-gray-500">
                    Gérez vos préférences de notification
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900">Notifications par email</p>
                          <p className="text-sm text-gray-500">Recevez des mises à jour par email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateField('email_notifications', settings.email_notifications ? 0 : 1)}
                        className={`relative w-12 h-6 rounded-full transition ${
                          settings.email_notifications ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                          settings.email_notifications ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">Notifications push</p>
                          <p className="text-sm text-gray-500">Notifications sur votre appareil</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateField('push_notifications', settings.push_notifications ? 0 : 1)}
                        className={`relative w-12 h-6 rounded-full transition ${
                          settings.push_notifications ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                          settings.push_notifications ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="font-medium text-gray-900">Notifications WhatsApp</p>
                          <p className="text-sm text-gray-500">Recevez des mises à jour sur WhatsApp</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateField('whatsapp_notifications', settings.whatsapp_notifications ? 0 : 1)}
                        className={`relative w-12 h-6 rounded-full transition ${
                          settings.whatsapp_notifications ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                          settings.whatsapp_notifications ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  SECTION PRÉFÉRENCES - TEXTES NOIRS
              ============================================================ */}
              {activeSection === 'preferences' && settings && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-green-500" />
                    Préférences
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Languages className="w-4 h-4 inline mr-2" />
                        Langue
                      </label>
                      <select
                        value={settings.language || 'fr'}
                        onChange={(e) => updateField('language', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <CreditCard className="w-4 h-4 inline mr-2" />
                        Devise
                      </label>
                      <select
                        value={settings.currency || 'FCFA'}
                        onChange={(e) => updateField('currency', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium"
                      >
                        <option value="FCFA">FCFA</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Fuseau horaire
                      </label>
                      <select
                        value={settings.timezone || 'Africa/Douala'}
                        onChange={(e) => updateField('timezone', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium"
                      >
                        <option value="Africa/Douala">Afrique/Douala (GMT+1)</option>
                        <option value="Africa/Lagos">Afrique/Lagos (GMT+1)</option>
                        <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                        <option value="America/New_York">Amérique/New York (GMT-4)</option>
                        <option value="Asia/Dubai">Asie/Dubai (GMT+4)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  SECTION SÉCURITÉ
              ============================================================ */}
              {activeSection === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-500" />
                    Sécurité
                  </h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium text-gray-900">Mot de passe</p>
                            <p className="text-sm text-gray-500">Modifier votre mot de passe</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium">
                          Modifier
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900">Double authentification</p>
                            <p className="text-sm text-gray-500">Sécurisez votre compte</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition text-sm font-medium">
                          Activer
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-purple-500" />
                          <div>
                            <p className="font-medium text-gray-900">Session active</p>
                            <p className="text-sm text-gray-500">Déconnectez-vous de tous les appareils</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition text-sm font-medium">
                          Déconnecter tout
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}