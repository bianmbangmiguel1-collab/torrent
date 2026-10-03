// app/security/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Globe,
  LogOut,
  Settings as SettingsIcon,
  User,
  Mail,
  Clock,
  Calendar,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  QrCode,
  Copy,
  CheckCheck,
  AlertTriangle,
  Info,
  Zap,
  Crown,
  Sparkles
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface Session {
  id: number
  device_type: string
  browser: string
  os: string
  ip: string
  created_at: string
  expires_at: string
  is_active: number
}

interface SecurityData {
  id: number
  name: string
  email: string
  is_verified: boolean
  is_admin: boolean
  two_factor_enabled: boolean
  two_factor_secret: string | null
  login_attempts: number
  lock_until: string | null
  last_login: string | null
  created_at: string
}

interface SecurityDataResponse {
  user?: SecurityData
  sessions?: Session[]
  error?: string
}

interface PasswordResponse {
  success?: boolean
  message?: string
  error?: string
}

interface TwoFactorResponse {
  success?: boolean
  enabled?: boolean
  message?: string
  error?: string
}

interface LogoutAllResponse {
  success?: boolean
  message?: string
  error?: string
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function SecurityPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading, logout } = useUser()
  
  const [security, setSecurity] = useState<SecurityData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // État pour le changement de mot de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  
  // État pour la double authentification
  const [toggling2FA, setToggling2FA] = useState(false)
  
  // État pour la déconnexion de toutes les sessions
  const [loggingOutAll, setLoggingOutAll] = useState(false)
  
  // État pour afficher le QR Code
  const [showQRCode, setShowQRCode] = useState(false)

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/security')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT DES DONNÉES DE SÉCURITÉ
  // ============================================================
  const fetchSecurityData = useCallback(async () => {
    try {
      const response = await fetch('/api/security', {
        credentials: 'include',
      })

      if (response.status === 401) {
        router.push('/login?redirect=/security')
        return
      }

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données de sécurité')
      }

      const data = await response.json() as SecurityDataResponse
      setSecurity(data.user || null)
      setSessions(data.sessions || [])
      setError(null)
      
    } catch (error) {
      console.error('❌ Erreur chargement sécurité:', error)
      setError(error instanceof Error ? error.message : 'Impossible de charger les données de sécurité.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSecurityData()
    }
  }, [isAuthenticated, fetchSecurityData])

  // ============================================================
  // CHANGER LE MOT DE PASSE
  // ============================================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setChangingPassword(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/security', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const data = await response.json() as PasswordResponse

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du changement de mot de passe')
      }

      setSuccess('Mot de passe modifié avec succès !')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => setSuccess(null), 5000)
      
    } catch (error) {
      console.error('❌ Erreur changement mot de passe:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe')
    } finally {
      setChangingPassword(false)
    }
  }

  // ============================================================
  // ACTIVER/DÉSACTIVER LA DOUBLE AUTHENTIFICATION
  // ============================================================
  const toggleTwoFactor = async () => {
    if (!security) return
    
    setToggling2FA(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          enable: !security.two_factor_enabled,
        }),
      })

      const data = await response.json() as TwoFactorResponse

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la modification')
      }

      setSecurity(prev => prev ? { ...prev, two_factor_enabled: data.enabled ?? false } : null)
      setSuccess(data.message || 'Modification effectuée')
      
      if (data.enabled) {
        setShowQRCode(true)
      }
      
      setTimeout(() => setSuccess(null), 5000)
      
    } catch (error) {
      console.error('❌ Erreur 2FA:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de la modification')
    } finally {
      setToggling2FA(false)
    }
  }

  // ============================================================
  // DÉCONNECTER TOUTES LES SESSIONS
  // ============================================================
  const handleLogoutAll = async () => {
    if (!window.confirm('Voulez-vous vraiment déconnecter toutes les sessions ?')) return
    
    setLoggingOutAll(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/security', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json() as LogoutAllResponse

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la déconnexion')
      }

      setSuccess('Toutes les sessions ont été déconnectées')
      setSessions([])
      
      setTimeout(() => setSuccess(null), 5000)
      
    } catch (error) {
      console.error('❌ Erreur déconnexion sessions:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de la déconnexion')
    } finally {
      setLoggingOutAll(false)
    }
  }

  // ============================================================
  // RÉINITIALISER LES ERREURS
  // ============================================================
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // ============================================================
  // GET ICÔNE DE SESSION
  // ============================================================
  const getSessionIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-blue-500" />
      case 'tablet':
        return <Tablet className="w-5 h-5 text-purple-500" />
      case 'desktop':
        return <Monitor className="w-5 h-5 text-green-500" />
      default:
        return <Laptop className="w-5 h-5 text-gray-500" />
    }
  }

  // ============================================================
  // FORMATER LA DATE
  // ============================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            <Shield className="w-12 h-12 text-blue-500 mx-auto" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos données de sécurité...</p>
          <p className="text-sm text-gray-400 mt-1">Vérification de votre compte</p>
        </div>
      </div>
    )
  }

  if (error && !security) {
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
              fetchSecurityData()
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
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Retour</span>
              </Link>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-blue-500" />
                  Sécurité
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Gérez la sécurité de votre compte
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setLoading(true)
                  fetchSecurityData()
                }}
                className="p-2 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ============================================================
              SIDEBAR - STATUT DE SÉCURITÉ
          ============================================================ */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                Statut de sécurité
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">Mot de passe</span>
                  </div>
                  <span className="text-xs font-medium text-green-600">Sécurisé</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700">2FA</span>
                  </div>
                  <span className={`text-xs font-medium ${security?.two_factor_enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                    {security?.two_factor_enabled ? 'Activée ✅' : 'Désactivée'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-700">Compte</span>
                  </div>
                  <span className={`text-xs font-medium ${security?.is_verified ? 'text-green-600' : 'text-red-600'}`}>
                    {security?.is_verified ? 'Vérifié ✅' : 'Non vérifié'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-gray-700">Email</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{security?.email}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-700">Dernière connexion</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {security?.last_login ? formatDate(security.last_login) : 'Jamais'}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  Pour une sécurité optimale, activez la double authentification
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================
              CONTENU PRINCIPAL
          ============================================================ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Messages de statut */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{success}</span>
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ============================================================
                SECTION : CHANGER LE MOT DE PASSE
            ============================================================ */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-blue-500" />
                Changer le mot de passe
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium pr-10"
                      placeholder="Entrez votre mot de passe actuel"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium pr-10"
                      placeholder="Entrez votre nouveau mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum 6 caractères</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 font-medium pr-10"
                      placeholder="Confirmez votre nouveau mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      Changer le mot de passe
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ============================================================
                SECTION : DOUBLE AUTHENTIFICATION
            ============================================================ */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-purple-500" />
                    Double authentification (2FA)
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Sécurisez votre compte avec une vérification en deux étapes
                  </p>
                </div>
                <button
                  onClick={toggleTwoFactor}
                  disabled={toggling2FA}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition font-medium ${
                    security?.two_factor_enabled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {toggling2FA ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : security?.two_factor_enabled ? (
                    <>
                      <X className="w-5 h-5" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Activer
                    </>
                  )}
                </button>
              </div>

              <div className={`mt-4 p-4 rounded-xl ${security?.two_factor_enabled ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <p className={`text-sm ${security?.two_factor_enabled ? 'text-green-700' : 'text-yellow-700'}`}>
                  {security?.two_factor_enabled ? (
                    '✅ La double authentification est activée pour votre compte'
                  ) : (
                    '⚠️ La double authentification n\'est pas activée. Nous vous recommandons de l\'activer pour plus de sécurité.'
                  )}
                </p>
              </div>

              {showQRCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-blue-700">Scannez le QR Code</p>
                      <p className="text-sm text-blue-600">
                        Utilisez une application d'authentification comme Google Authenticator ou Authy
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center border-2 border-blue-200">
                      <QrCode className="w-32 h-32 text-gray-800" />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQRCode(false)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 transition"
                  >
                    Fermer
                  </button>
                </motion.div>
              )}
            </div>

            {/* ============================================================
                SECTION : SESSIONS ACTIVES
            ============================================================ */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-500" />
                    Sessions actives
                  </h2>
                  <p className="text-sm text-gray-500">
                    {sessions.length} session{sessions.length > 1 ? 's' : ''} active{sessions.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={handleLogoutAll}
                  disabled={loggingOutAll || sessions.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition disabled:opacity-50 text-sm font-medium"
                >
                  {loggingOutAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Déconnecter tout
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Aucune session active</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        {getSessionIcon(session.device_type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {session.device_type || 'Appareil inconnu'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {session.browser || 'Navigateur inconnu'} • {session.os || 'OS inconnu'}
                        </p>
                        <p className="text-xs text-gray-400">
                          IP: {session.ip || 'Inconnue'} • Connecté le {formatDate(session.created_at)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        Actif
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ============================================================
                SECTION : CONSEILS DE SÉCURITÉ
            ============================================================ */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Conseils de sécurité
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Utilisez un mot de passe fort et unique pour votre compte
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Activez la double authentification pour une sécurité renforcée
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Déconnectez-vous des appareils que vous n'utilisez plus
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Ne partagez jamais vos identifiants avec personne
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}