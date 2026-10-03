// app/profile/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Bell,
  Mail as MailIcon,
  Shield,
  Trash2,
  ArrowLeft,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Smartphone,
  Award,
  ShoppingBag,
  Heart,
  Star,
  Loader2,
  ChevronDown,
} from 'lucide-react'

import { useUser } from '@/context/UserContext'

// ============================================================
// LISTE DE 10 PAYS (avec clés uniques)
// ============================================================
const COUNTRIES = [
  { id: 'cm', code: '+237', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
  { id: 'fr', code: '+33', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { id: 'us', code: '+1', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
  { id: 'ca', code: '+1', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { id: 'gb', code: '+44', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
  { id: 'de', code: '+49', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
  { id: 'it', code: '+39', name: 'Italie', flag: '🇮🇹', dialCode: '+39' },
  { id: 'es', code: '+34', name: 'Espagne', flag: '🇪🇸', dialCode: '+34' },
  { id: 'sn', code: '+221', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  { id: 'ci', code: '+225', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
]

// ============================================================
// TYPES DE RÉPONSES API
// ============================================================
interface ProfileResponse {
  success?: boolean
  message?: string
  error?: string
}

interface UploadResponse {
  success?: boolean
  message?: string
  error?: string
}

interface PasswordResponse {
  success?: boolean
  message?: string
  error?: string
}

interface DeleteResponse {
  success?: boolean
  message?: string
  error?: string
}

interface Toggle2FAResponse {
  success?: boolean
  message?: string
  error?: string
}

interface GeoResponse {
  country_name?: string
  country_calling_code?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: userLoading, refreshUser, logout } = useUser()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // FORMULAIRE – 100% snake_case
  // ============================================================
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
  })

  const [preferences, setPreferences] = useState({
    notifications: true,
    newsletter: true,
    emailUpdates: true,
    twoFactor: false,
    pushNotifications: false,
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login')
    }
  }, [userLoading, user, router])

  // ============================================================
  // INITIALISATION DU FORMULAIRE DEPUIS LE CONTEXTE
  // ============================================================
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        postal_code: user.postal_code || '',
      })

      if (user.preferences) {
        setPreferences({
          notifications: user.preferences.notifications !== false,
          newsletter: user.preferences.newsletter || false,
          emailUpdates: user.preferences.emailUpdates !== false,
          twoFactor: user.preferences.twoFactor || false,
          pushNotifications: user.preferences.pushNotifications || false,
        })
      }

      // Trouver le pays correspondant au téléphone
      if (user.phone) {
        const match = user.phone.match(/^(\+\d+)/)
        if (match) {
          const found = COUNTRIES.find((c) => c.dialCode === match[1])
          if (found) setSelectedCountry(found)
        }
      }
      if (user.country) {
        const found = COUNTRIES.find((c) => c.name === user.country)
        if (found) setSelectedCountry(found)
      }
    }
  }, [user])

  // Fermer le dropdown au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Détection du pays (via IP) – une fois au montage
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json() as GeoResponse
        if (data.country_name) {
          const found = COUNTRIES.find((c) => c.name === data.country_name)
          if (found && !user?.country) {
            setSelectedCountry(found)
            setFormData((prev) => ({ ...prev, country: data.country_name || '' }))
          }
        }
        if (data.country_calling_code) {
          const found = COUNTRIES.find((c) => c.dialCode === data.country_calling_code)
          if (found && !user?.phone) {
            setSelectedCountry(found)
          }
        }
      } catch (error) {
        console.warn('Impossible de détecter le pays', error)
      }
    }
    detectCountry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // SAUVEGARDE UNIFIÉE (formulaire + préférences)
  // ============================================================
  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          postal_code: formData.postal_code,
          preferences,
        }),
      })

      const data = await response.json() as ProfileResponse

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la mise à jour')
      }

      await refreshUser()

      setSuccess(data.message || 'Profil mis à jour avec succès')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveProfile()
  }

  // ============================================================
  // UPLOAD AVATAR
  // ============================================================
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5MB")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formDataFile = new FormData()
      formDataFile.append('avatar', file)

      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formDataFile,
      })

      if (!response.ok) {
        const data = await response.json() as UploadResponse
        throw new Error(data.message || "Erreur lors de l'upload")
      }

      await refreshUser()

      setSuccess('Photo de profil mise à jour !')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  // ============================================================
  // CHANGEMENT DE MOT DE PASSE
  // ============================================================
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (passwordData.newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json() as PasswordResponse
        throw new Error(data.message || 'Erreur lors du changement de mot de passe')
      }

      setSuccess('Mot de passe modifié avec succès !')
      setShowPasswordModal(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe')
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // SUPPRESSION DE COMPTE
  // ============================================================
  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/auth/delete', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json() as DeleteResponse
        throw new Error(data.message || 'Erreur lors de la suppression')
      }

      await logout()
      router.push('/login?deleted=true')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la suppression')
      setShowDeleteModal(false)
    }
  }

  // ============================================================
  // ACTIVATION 2FA
  // ============================================================
  const handleToggle2FA = async () => {
    try {
      const response = await fetch('/api/auth/toggle-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !preferences.twoFactor }),
      })

      if (!response.ok) {
        const data = await response.json() as Toggle2FAResponse
        throw new Error(data.message || 'Erreur lors de la mise à jour 2FA')
      }

      setPreferences((prev) => ({ ...prev, twoFactor: !prev.twoFactor }))
      await refreshUser()
      setSuccess(`2FA ${!preferences.twoFactor ? 'activée' : 'désactivée'} avec succès !`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour 2FA')
    }
  }

  // ============================================================
  // STATS (avec clés uniques)
  // ============================================================
  const stats = [
    { id: 'purchases', icon: ShoppingBag, value: user?.purchases?.length || 0, label: 'Commandes' },
    { id: 'favorites', icon: Heart, value: user?.favorites?.length || 0, label: 'Favoris' },
    { id: 'reviews', icon: Star, value: user?.reviews?.length || 0, label: 'Avis' },
    { id: 'score', icon: Award, value: user?.score || 0, label: 'Points' },
  ]

  // ============================================================
  // CHARGEMENT
  // ============================================================
  if (userLoading || !user) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Chargement de votre profil...</p>
      </div>
    )
  }

  // ============================================================
  // AVATAR – utilisation directe du chemin (servi par Next.js)
  // ============================================================
  const avatarUrl = user?.avatar || null

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="profile-page">
      <button className="back-btn" onClick={() => router.push('/dashboard')}>
        <ArrowLeft size={20} />
        Retour au tableau de bord
      </button>

      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} />
            ) : (
              <span>{user?.name?.charAt(0) || 'U'}</span>
            )}
            <button
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={18} className="spinning" /> : <Camera size={18} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </div>
          <div className="profile-user-info">
            <h1>{user?.name}</h1>
            <p className="profile-email">{user?.email}</p>
            <div className="profile-stats">
              {stats.map((stat) => (
                <div key={stat.id} className="stat-item">
                  <stat.icon size={16} />
                  <span>{stat.value}</span>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="message error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="message success">
          <CheckCircle size={20} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="profile-tabs">
        {[
          { id: 'profile', icon: User, label: 'Informations' },
          { id: 'preferences', icon: Bell, label: 'Préférences' },
          { id: 'security', icon: Shield, label: 'Sécurité' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile-form"
            onSubmit={handleSubmit}
          >
            <div className="form-grid">
              <div className="form-group">
                <label>Nom complet</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Votre nom"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input type="email" value={formData.email} disabled className="disabled" />
                </div>
                <p className="field-hint">L'email ne peut pas être modifié</p>
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <div className="phone-input-group" ref={dropdownRef}>
                  <button
                    type="button"
                    className="country-selector"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  >
                    <span className="country-flag">{selectedCountry.flag}</span>
                    <span className="country-code">{selectedCountry.dialCode}</span>
                    <ChevronDown
                      size={16}
                      className={`dropdown-chevron ${showCountryDropdown ? 'open' : ''}`}
                    />
                  </button>
                  {showCountryDropdown && (
                    <div className="country-dropdown">
                      {COUNTRIES.map((country) => (
                        <button
                          key={country.id}
                          type="button"
                          className="country-option"
                          onClick={() => {
                            setSelectedCountry(country)
                            setShowCountryDropdown(false)
                            setFormData((prev) => ({
                              ...prev,
                              country: country.name,
                              phone: country.dialCode + prev.phone.replace(/^\+\d+/, ''),
                            }))
                          }}
                        >
                          <span className="country-flag">{country.flag}</span>
                          <span className="country-name">{country.name}</span>
                          <span className="country-code">{country.dialCode}</span>
                          {selectedCountry.id === country.id && (
                            <CheckCircle size={16} className="country-check" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="tel"
                    value={formData.phone.replace(selectedCountry.dialCode, '')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setFormData({
                        ...formData,
                        phone: selectedCountry.dialCode + value,
                      })
                    }}
                    placeholder="6XX XX XX XX"
                    className="phone-input"
                  />
                </div>
                <p className="field-hint">
                  Pays : {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
                </p>
              </div>

              <div className="form-group">
                <label>Bio</label>
                <div className="input-with-icon">
                  <Edit2 size={18} />
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Parlez-nous un peu de vous..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Adresse</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rue, quartier"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Votre ville"
                />
              </div>

              <div className="form-group">
                <label>Pays</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Votre pays"
                />
              </div>

              <div className="form-group">
                <label>Code postal</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="Code postal"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? (
                  <span className="loading-spinner" />
                ) : (
                  <>
                    <Save size={18} />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}

        {activeTab === 'preferences' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="preferences-section"
          >
            <div className="preference-card">
              <div className="preference-item">
                <div className="preference-info">
                  <Bell size={20} />
                  <div>
                    <h4>Notifications</h4>
                    <p>Recevoir des notifications sur vos commandes et activités</p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) =>
                      setPreferences({ ...preferences, notifications: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <MailIcon size={20} />
                  <div>
                    <h4>Newsletter</h4>
                    <p>Recevoir nos promotions et nouveautés par email</p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.newsletter}
                    onChange={(e) =>
                      setPreferences({ ...preferences, newsletter: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <MailIcon size={20} />
                  <div>
                    <h4>Emails transactionnels</h4>
                    <p>Recevoir les emails de confirmation et de suivi de commande</p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.emailUpdates}
                    onChange={(e) =>
                      setPreferences({ ...preferences, emailUpdates: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <Smartphone size={20} />
                  <div>
                    <h4>Notifications push</h4>
                    <p>Recevoir des notifications sur votre mobile</p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.pushNotifications}
                    onChange={(e) =>
                      setPreferences({ ...preferences, pushNotifications: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-save"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <span className="loading-spinner" />
                ) : (
                  <>
                    <Save size={18} />
                    Enregistrer les préférences
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="security-section"
          >
            <div className="security-card">
              <h3>Mot de passe</h3>
              <p>Modifiez votre mot de passe régulièrement pour plus de sécurité</p>
              <button className="btn-security" onClick={() => setShowPasswordModal(true)}>
                <Lock size={18} />
                Changer le mot de passe
              </button>
            </div>

            <div className="security-card">
              <h3>Authentification à deux facteurs</h3>
              <p>Renforcez la sécurité de votre compte avec la 2FA</p>
              <div className="preference-item">
                <div className="preference-info">
                  <Shield size={20} />
                  <div>
                    <h4>{preferences.twoFactor ? 'Activée' : 'Désactivée'}</h4>
                    <p>
                      {preferences.twoFactor
                        ? 'Votre compte est protégé par 2FA'
                        : 'Activez la 2FA pour plus de sécurité'}
                    </p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.twoFactor}
                    onChange={handleToggle2FA}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="security-card danger">
              <h3>Zone dangereuse</h3>
              <p>
                Cette action est irréversible. La suppression de votre compte entraînera la perte
                de toutes vos données.
              </p>
              <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={18} />
                Supprimer mon compte
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modale changement de mot de passe */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Changer le mot de passe</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Mot de passe actuel</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirmer le nouveau mot de passe</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                className="show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                {showPassword ? 'Masquer' : 'Afficher'} les mots de passe
              </button>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPasswordModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? <span className="loading-spinner" /> : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale suppression de compte */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Supprimer votre compte</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Cette action est <strong>irréversible</strong>. En supprimant votre compte :
              </p>
              <ul>
                <li>Toutes vos données personnelles seront effacées</li>
                <li>Votre historique d'achats sera perdu</li>
                <li>Vous ne pourrez plus accéder à vos produits</li>
                <li>Cette action ne peut pas être annulée</li>
              </ul>
              <p className="confirm-text">Êtes-vous sûr de vouloir continuer ?</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button className="btn-danger" onClick={handleDeleteAccount}>
                <Trash2 size={18} />
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== STYLES (inchangés) ========== */}
      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 24px;
          max-width: 900px;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
          transition: color 0.3s ease;
          padding: 8px 0;
        }

        .back-btn:hover {
          color: #2563eb;
        }

        .profile-header {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .profile-avatar-section {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .profile-avatar {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          overflow: hidden;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-upload-btn {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid white;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }

        .avatar-upload-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .avatar-upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .profile-user-info h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }

        .profile-email {
          color: #64748b;
          font-size: 14px;
          margin: 4px 0 12px;
        }

        .profile-stats {
          display: flex;
          gap: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 13px;
        }

        .stat-item span:first-of-type {
          font-weight: 600;
          color: #1a1a2e;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .message.error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .message.success {
          background: #dcfce7;
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }

        .message button {
          background: none;
          border: none;
          cursor: pointer;
          margin-left: auto;
          opacity: 0.6;
        }

        .profile-tabs {
          display: flex;
          gap: 4px;
          background: #ffffff;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          background: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab:hover {
          background: #f1f5f9;
        }

        .tab.active {
          background: #2563eb;
          color: white;
        }

        .profile-content {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          border: 1px solid #e2e8f0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #1a1a2e;
          margin-bottom: 6px;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon svg {
          position: absolute;
          left: 12px;
          color: #94a3b8;
          z-index: 1;
        }

        .input-with-icon input,
        .input-with-icon textarea {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.3s ease;
          font-family: inherit;
          background: #f8fafc;
          color: #1a1a2e;
        }

        .input-with-icon input:focus,
        .input-with-icon textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.04);
          background: #ffffff;
        }

        .input-with-icon input.disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .input-with-icon textarea {
          resize: vertical;
          min-height: 80px;
          padding-top: 10px;
        }

        .phone-input-group {
          display: flex;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
        }

        .phone-input-group:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.04);
          background: #ffffff;
        }

        .country-selector {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-right: 1px solid #e2e8f0;
          cursor: pointer;
          font-size: 14px;
          color: #1a1a2e;
          white-space: nowrap;
          min-width: 90px;
          flex-shrink: 0;
        }

        .country-selector:hover {
          background: #f1f5f9;
        }

        .country-flag {
          font-size: 20px;
        }

        .country-code {
          font-weight: 500;
          color: #64748b;
        }

        .dropdown-chevron {
          transition: transform 0.3s ease;
          color: #94a3b8;
        }

        .dropdown-chevron.open {
          transform: rotate(180deg);
        }

        .country-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          margin-top: 4px;
        }

        .country-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: #1a1a2e;
          transition: background 0.2s ease;
        }

        .country-option:hover {
          background: #f1f5f9;
        }

        .country-option .country-name {
          flex: 1;
        }

        .country-check {
          color: #22c55e;
          margin-left: auto;
        }

        .phone-input {
          flex: 1;
          padding: 10px 12px;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #1a1a2e;
          min-width: 0;
        }

        .form-group input:not(.input-with-icon input) {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          background: #f8fafc;
          transition: all 0.3s ease;
          color: #1a1a2e;
        }

        .form-group input:not(.input-with-icon input):focus {
          outline: none;
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.04);
        }

        .field-hint {
          font-size: 12px;
          color: #94a3b8;
          margin: 4px 0 0;
        }

        .form-actions {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 28px;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.2);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .preference-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .preference-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .preference-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .preference-info h4 {
          margin: 0;
          font-size: 14px;
          color: #1a1a2e;
        }

        .preference-info p {
          margin: 2px 0 0;
          font-size: 13px;
          color: #64748b;
        }

        .toggle {
          position: relative;
          width: 44px;
          height: 24px;
          cursor: pointer;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          inset: 0;
          background: #cbd5e1;
          border-radius: 12px;
          transition: background 0.3s ease;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .toggle input:checked + .toggle-slider {
          background: #2563eb;
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(20px);
        }

        .security-card {
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }

        .security-card h3 {
          margin: 0 0 4px;
          font-size: 16px;
          color: #1a1a2e;
        }

        .security-card p {
          margin: 0 0 16px;
          font-size: 14px;
          color: #64748b;
        }

        .security-card.danger {
          border-color: #fecaca;
          background: #fef2f2;
        }

        .security-card.danger h3 {
          color: #dc2626;
        }

        .btn-security {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #2563eb;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .btn-security:hover {
          background: #1d4ed8;
        }

        .btn-danger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #dc2626;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content.danger {
          border: 2px solid #fecaca;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #1a1a2e;
        }

        .modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        .modal-body ul {
          margin: 12px 0;
          padding-left: 20px;
          color: #64748b;
        }

        .modal-body ul li {
          margin: 6px 0;
        }

        .confirm-text {
          font-weight: 600;
          color: #dc2626;
          margin-top: 16px;
        }

        .show-password-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #2563eb;
          cursor: pointer;
          font-size: 13px;
          padding: 8px 0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-cancel {
          padding: 10px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .btn-cancel:hover {
          background: #e2e8f0;
        }

        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          background: #f8fafc;
        }

        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 16px;
          }

          .profile-avatar-section {
            flex-direction: column;
            text-align: center;
          }

          .profile-stats {
            justify-content: center;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: span 1;
          }

          .profile-tabs {
            flex-direction: column;
          }

          .profile-content {
            padding: 20px;
          }

          .profile-header {
            padding: 20px;
          }

          .modal-content {
            padding: 24px;
            margin: 16px;
          }
        }

        @media (max-width: 480px) {
          .preference-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .profile-stats {
            flex-wrap: wrap;
            gap: 12px;
          }

          .country-selector {
            min-width: 70px;
            padding: 8px 10px;
            font-size: 12px;
          }

          .country-flag {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}