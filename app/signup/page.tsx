// app/signup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Sparkles,
  Rocket,
  Shield,
  Zap,
  X,
  ShieldCheck,
  FileText,
  Database,
  UserCheck,
  LockKeyhole,
  Server,
  Phone,
  CreditCard,
  AlertCircle,
  Gift,
  Check,
  ExternalLink,
} from 'lucide-react'
import styles from './signup.module.css'

// ============================================================
// PARTICULES DÉTERMINISTES
// ============================================================
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 37.17 + 8) % 100}%`,
  top: `${(i * 61.73 + 5) % 100}%`,
  animationDelay: `${(i * 1.37) % 10}s`,
  width: `${2 + ((i * 17) % 4)}px`,
  height: `${2 + ((i * 23) % 4)}px`,
}))

// ============================================================
// Types
// ============================================================
interface SignupResponse {
  success?: boolean
  error?: string
  message?: string
  token?: string
  user?: {
    id?: number
    user_id?: number
    email?: string
    name?: string
    role?: string
    is_admin?: boolean | number
    is_verified?: boolean | number
    created_at?: string
    updated_at?: string
  }
}

export default function SignupPage() {
  const router = useRouter()

  // 🛡️ Garde anti-hydration (résout le warning "Prop style did not match")
  const [mounted, setMounted] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Force du mot de passe
  useEffect(() => {
    const checkStrength = (pwd: string) => {
      let strength = 0
      if (pwd.length >= 8) strength++
      if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength++
      if (pwd.match(/\d/)) strength++
      if (pwd.match(/[^a-zA-Z\d]/)) strength++
      return strength
    }
    setPasswordStrength(checkStrength(formData.password))
  }, [formData.password])

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return 'Très faible'
    if (passwordStrength === 1) return 'Faible'
    if (passwordStrength === 2) return 'Moyen'
    if (passwordStrength === 3) return 'Fort'
    return 'Très fort'
  }

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return '#ef4444'
    if (passwordStrength === 2) return '#f59e0b'
    if (passwordStrength === 3) return '#3b82f6'
    return '#22c55e'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      triggerShake()
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      triggerShake()
      return
    }

    if (!acceptedPrivacy || !acceptedTerms) {
      setError(
        "Veuillez accepter les conditions d'utilisation et la politique de confidentialité"
      )
      triggerShake()
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      const data = await response.json() as SignupResponse

      if (!response.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'inscription")
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
      }

      if (data.user) {
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: data.user.id,
            user_id: data.user.user_id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            is_admin: data.user.is_admin,
            is_verified: data.user.is_verified,
            created_at: data.user.created_at,
            updated_at: data.user.updated_at,
          })
        )
      }

      setIsSuccess(true)

      setTimeout(() => {
        router.push('/onboarding')
      }, 2500)
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'inscription")
      setIsSubmitting(false)
      triggerShake()
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const benefits = [
    { icon: Rocket, text: 'Accès instantané aux produits', color: '#a5b4fc' },
    { icon: Shield, text: 'Sécurité et confidentialité', color: '#93c5fd' },
    { icon: Zap, text: 'Livraison digitale immédiate', color: '#fcd34d' },
    { icon: Gift, text: 'Offres exclusives membres', color: '#f9a8d4' },
  ]

  // ---- Modales ----
  const PrivacyPolicy = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && setShowPrivacy(false)}
    >
      <motion.div
        className={styles.modalContent}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <motion.button
          className={styles.modalClose}
          onClick={() => setShowPrivacy(false)}
          type="button"
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={24} />
        </motion.button>
        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <ShieldCheck size={40} />
            <h2>Politique de confidentialité</h2>
            <p>Dernière mise à jour : 22 août 2026</p>
          </div>

          <div className={styles.privacySection}>
            <h3><Database size={20} /> 1. Collecte des données</h3>
            <p>
              TorrentTwist collecte les informations suivantes pour vous offrir
              la meilleure expérience :
            </p>
            <ul>
              <li><strong>Informations d'identification :</strong> Nom, prénom, adresse email, numéro de téléphone</li>
              <li><strong>Données de connexion :</strong> Adresse IP, navigateur, système d'exploitation</li>
              <li><strong>Données d'utilisation :</strong> Pages visitées, temps passé, interactions</li>
              <li><strong>Données de transaction :</strong> Historique d'achats, moyens de paiement</li>
              <li><strong>Cookies :</strong> Pour améliorer votre expérience utilisateur</li>
            </ul>
          </div>

          <div className={styles.privacySection}>
            <h3><LockKeyhole size={20} /> 2. Utilisation des données</h3>
            <p>Vos données sont utilisées pour :</p>
            <ul>
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Traiter vos commandes et paiements</li>
              <li>Personnaliser votre expérience sur la plateforme</li>
              <li>Vous envoyer des communications marketing (avec votre consentement)</li>
              <li>Améliorer nos services et produits</li>
            </ul>
          </div>

          <div className={styles.privacySection}>
            <h3><Server size={20} /> 3. Stockage et sécurité</h3>
            <p>Vos données sont protégées par :</p>
            <ul>
              <li>Chiffrement SSL/TLS pour toutes les transmissions</li>
              <li>Chiffrement des données sensibles en base de données</li>
              <li>Authentification à deux facteurs pour les administrateurs</li>
              <li>Sauvegardes quotidiennes avec chiffrement</li>
            </ul>
          </div>

          <div className={styles.privacyFooter}>
            <motion.button
              className={styles.acceptBtn}
              onClick={() => {
                setAcceptedPrivacy(true)
                setShowPrivacy(false)
              }}
              type="button"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Check size={18} /> J'accepte la politique de confidentialité
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  const TermsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && setShowTerms(false)}
    >
      <motion.div
        className={styles.modalContent}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <motion.button
          className={styles.modalClose}
          onClick={() => setShowTerms(false)}
          type="button"
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={24} />
        </motion.button>
        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <FileText size={40} />
            <h2>Conditions d'utilisation</h2>
            <p>Dernière mise à jour : 22 août 2026</p>
          </div>

          <div className={styles.privacySection}>
            <h3><UserCheck size={20} /> 1. Acceptation des conditions</h3>
            <p>
              En créant un compte sur TorrentTwist, vous acceptez pleinement et
              sans réserve les présentes conditions d'utilisation.
            </p>
          </div>

          <div className={styles.privacySection}>
            <h3><User size={20} /> 2. Compte utilisateur</h3>
            <ul>
              <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
              <li>Vous devez fournir des informations exactes et à jour</li>
              <li>Vous êtes responsable de toutes les activités effectuées sous votre compte</li>
            </ul>
          </div>

          <div className={styles.privacySection}>
            <h3><CreditCard size={20} /> 3. Produits et services</h3>
            <ul>
              <li>Les produits sont livrés sous forme numérique (téléchargement)</li>
              <li>Les prix sont indiqués en FCFA et peuvent être modifiés</li>
              <li>La livraison est instantanée après paiement validé</li>
            </ul>
          </div>

          <div className={styles.privacyFooter}>
            <motion.button
              className={styles.acceptBtn}
              onClick={() => {
                setAcceptedTerms(true)
                setShowTerms(false)
              }}
              type="button"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Check size={18} /> J'accepte les conditions d'utilisation
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  // ============================================================
  // 🛡️ GARDE ANTI-HYDRATION — rendu serveur minimal
  // ============================================================
  if (!mounted) {
    return (
      <div className={styles.page}>
        <div className={styles.bg}>
          <div className={styles.gradientOverlay} />
        </div>
        <div className={styles.container}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(122, 156, 245, 0.3)',
                borderTopColor: '#7a9cf5',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL (uniquement après mount)
  // ============================================================
  return (
    <div className={styles.page}>
      {/* Fond animé */}
      <div className={styles.bg}>
        <div className={styles.gradientOverlay} />
        <div className={`${styles.glow} ${styles.glow1}`} />
        <div className={`${styles.glow} ${styles.glow2}`} />
        <div className={`${styles.glow} ${styles.glow3}`} />
        <div className={styles.particles}>
          {PARTICLES.map((particle) => (
            <div
              key={particle.id}
              className={styles.particle}
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.animationDelay,
                width: particle.width,
                height: particle.height,
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.container}>
        <motion.button
          className={styles.backButton}
          whileHover={{ scale: 1.1, x: -3 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/')}
          type="button"
        >
          <ArrowLeft size={20} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={styles.header}
        >
          <div className={styles.logoContainer}>
            <img src="/torrent-icon.png" alt="TorrentTwist" className={styles.logoImage} />
          </div>
          <div className={styles.headerBadge}>
            <Sparkles size={14} />
            <span>Rejoignez l'aventure</span>
          </div>
          <h1>Créer un compte</h1>
          <p>Accédez à un univers digital sans limites</p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: 0 }}
            animate={
              shake
                ? { opacity: 1, y: 0, x: [0, -10, 10, -10, 10, 0] }
                : { opacity: 1, y: 0, x: 0 }
            }
            transition={{ duration: shake ? 0.5 : 0.3 }}
            className={styles.errorMessage}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        <motion.div
          className={styles.benefits}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {benefits.map((benefit, i) => (
            <motion.div
              key={i}
              className={styles.benefitItem}
              whileHover={{ scale: 1.05, y: -2 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <benefit.icon size={16} color={benefit.color} />
              <span>{benefit.text}</span>
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.successMessage}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <CheckCircle size={64} className={styles.successIcon} />
              </motion.div>
              <h2>Compte créé avec succès !</h2>
              <p>Préparation de votre espace personnel...</p>
              <div className={styles.successLoader}>
                <div className={styles.loaderBar} />
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onSubmit={handleSubmit}
              className={styles.form}
            >
              {/* Nom */}
              <div className={styles.formGroup}>
                <label htmlFor="name">
                  <User size={16} /> Nom complet
                </label>
                <div
                  className={`${styles.inputWrapper} ${
                    focusedField === 'name' ? styles.inputWrapperFocused : ''
                  }`}
                >
                  <User size={20} className={styles.inputIcon} />
                  <input
                    id="name"
                    type="text"
                    placeholder="Jean Dupont"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Email */}
              <div className={styles.formGroup}>
                <label htmlFor="email">
                  <Mail size={16} /> Adresse email
                </label>
                <div
                  className={`${styles.inputWrapper} ${
                    focusedField === 'email' ? styles.inputWrapperFocused : ''
                  }`}
                >
                  <Mail size={20} className={styles.inputIcon} />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div className={styles.formGroup}>
                <label htmlFor="phone">
                  <Phone size={16} /> Numéro de téléphone (optionnel)
                </label>
                <div
                  className={`${styles.inputWrapper} ${
                    focusedField === 'phone' ? styles.inputWrapperFocused : ''
                  }`}
                >
                  <Phone size={20} className={styles.inputIcon} />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className={styles.formGroup}>
                <label htmlFor="password">
                  <Lock size={16} /> Mot de passe
                </label>
                <div
                  className={`${styles.inputWrapper} ${
                    focusedField === 'password' ? styles.inputWrapperFocused : ''
                  }`}
                >
                  <Lock size={20} className={styles.inputIcon} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength={8}
                    disabled={isSubmitting}
                  />
                  <motion.button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </motion.button>
                </div>
                {formData.password && (
                  <div className={styles.passwordStrength}>
                    <div className={styles.strengthBar}>
                      <motion.div
                        className={styles.strengthFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength / 4) * 100}%` }}
                        transition={{ duration: 0.3 }}
                        style={{ backgroundColor: getStrengthColor() }}
                      />
                    </div>
                    <motion.span
                      key={getStrengthLabel()}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ color: getStrengthColor() }}
                    >
                      {getStrengthLabel()}
                    </motion.span>
                  </div>
                )}
              </div>

              {/* Confirmer mot de passe */}
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">
                  <Lock size={16} /> Confirmer le mot de passe
                </label>
                <div
                  className={`${styles.inputWrapper} ${
                    focusedField === 'confirm' ? styles.inputWrapperFocused : ''
                  }`}
                >
                  <Lock size={20} className={styles.inputIcon} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isSubmitting}
                  />
                  <motion.button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </motion.button>
                </div>
                {formData.confirmPassword && formData.password && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${styles.passwordMatch} ${
                      formData.password === formData.confirmPassword
                        ? styles.match
                        : styles.mismatch
                    }`}
                  >
                    {formData.password === formData.confirmPassword ? (
                      <>
                        <Check size={14} /> Les mots de passe correspondent
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} /> Les mots de passe ne correspondent pas
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Termes — Cases custom animées */}
              <div className={styles.terms}>
                <motion.label
                  className={styles.termLabel}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    required
                    disabled={isSubmitting}
                    className={styles.hiddenCheckbox}
                  />
                  <motion.span
                    className={`${styles.customCheckbox} ${
                      acceptedPrivacy ? styles.customCheckboxChecked : ''
                    }`}
                    animate={acceptedPrivacy ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatePresence>
                      {acceptedPrivacy && (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          <Check size={14} strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  <span className={styles.termText}>
                    J'accepte la{' '}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={(e) => {
                        e.preventDefault()
                        setShowPrivacy(true)
                      }}
                    >
                      politique de confidentialité
                      <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4 }} />
                    </button>
                  </span>
                </motion.label>

                <motion.label
                  className={styles.termLabel}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                    disabled={isSubmitting}
                    className={styles.hiddenCheckbox}
                  />
                  <motion.span
                    className={`${styles.customCheckbox} ${
                      acceptedTerms ? styles.customCheckboxChecked : ''
                    }`}
                    animate={acceptedTerms ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatePresence>
                      {acceptedTerms && (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          <Check size={14} strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  <span className={styles.termText}>
                    J'accepte les{' '}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={(e) => {
                        e.preventDefault()
                        setShowTerms(true)
                      }}
                    >
                      conditions d'utilisation
                      <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4 }} />
                    </button>
                  </span>
                </motion.label>
              </div>

              {/* Bouton principal */}
              <motion.button
                type="submit"
                className={styles.signupButton}
                whileHover={
                  isSubmitting
                    ? {}
                    : {
                        scale: 1.03,
                        boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)',
                      }
                }
                whileTap={
                  isSubmitting
                    ? {}
                    : {
                        scale: 0.97,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                      }
                }
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className={styles.loading}>
                    <span className={styles.loader} />
                    Inscription en cours...
                  </span>
                ) : (
                  <>
                    Créer mon compte <Rocket size={18} />
                  </>
                )}
              </motion.button>

              {/* Footer */}
              <div className={styles.footer}>
                <p className={styles.loginLink}>
                  Déjà un compte ? <Link href="/login">Connectez-vous</Link>
                </p>
                <div className={styles.divider}>
                  <span>ou</span>
                </div>
                <div className={styles.socialLogin}>
                  <motion.button
                    type="button"
                    className={`${styles.socialBtn} ${styles.socialBtnGoogle}`}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.645 1.237 6.442l4.029 3.323z" />
                      <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.03 3.32A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-2.85l-3.793-3.137z" />
                      <path fill="#4A90E2" d="M19.834 21.15A11.93 11.93 0 0 0 24 12c0-1.1-.157-2.16-.44-3.17H12v6.34h4.99c-.214 1.16-.833 2.14-1.72 2.814l3.564 3.166z" />
                      <path fill="#FBBC05" d="M5.266 9.765A7.077 7.077 0 0 0 4.909 12c0 .782.126 1.535.357 2.24l-4.03-3.322a11.93 11.93 0 0 1 0-1.835l4.03 3.682z" />
                    </svg>
                    Google
                  </motion.button>
                  <motion.button
                    type="button"
                    className={`${styles.socialBtn} ${styles.socialBtnGithub}`}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    GitHub
                  </motion.button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPrivacy && <PrivacyPolicy />}
        {showTerms && <TermsModal />}
      </AnimatePresence>
    </div>
  )
}