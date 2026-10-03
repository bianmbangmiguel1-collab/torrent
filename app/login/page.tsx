// app/login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import styles from './login.module.css'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, user } = useUser()
  const redirectParam = searchParams.get('redirect') || null

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirection automatique (admin + client)
  useEffect(() => {
    if (!isAuthenticated) return

    const userIsAdmin = user?.is_admin === true || user?.role === 'admin'

    if (userIsAdmin) {
      console.log('🔀 Admin détecté → redirection vers /admin')
      router.replace('/admin')
      return
    }

    const safeRedirect = getSafeRedirect(redirectParam)
    if (safeRedirect) {
      router.replace(safeRedirect)
    } else {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, user, router, redirectParam])

  const getSafeRedirect = (url: string | null): string | null => {
    if (!url) return null
    if (url.startsWith('/')) {
      if (url.startsWith('//') || url.startsWith('http://') || url.startsWith('https://')) {
        return null
      }
      return url
    }
    return null
  }

  const safeRedirect = getSafeRedirect(redirectParam)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      setIsSuccess(true)
    } catch (error: any) {
      setError(error.message || 'Email ou mot de passe incorrect')
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Shield, text: 'Connexion sécurisée' },
    { icon: Zap, text: 'Accès instantané' },
  ]

  return (
    <div className={styles.page}>
      {/* Décor */}
      <div className={styles.bgDecor}>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        <div className={`${styles.blob} ${styles.blob3}`} />
        <div className={styles.gridPattern} />
      </div>

      <div className={styles.container}>
        <motion.button
          className={styles.backButton}
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
          aria-label="Retour"
          type="button"
        >
          <ArrowLeft size={18} />
        </motion.button>

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.header}
        >
          <div className={styles.logoContainer}>
            <img src="/torrent.png" alt="TorrentTwist" className={styles.logoImage} />
          </div>

          <div className={styles.headerBadge}>
            <Sparkles size={13} />
            <span>Bienvenue</span>
          </div>

          <h1>Connectez-vous</h1>
          <p>Retrouvez votre espace TorrentTwist</p>
        </motion.div>

        {/* Features */}
        <motion.div
          className={styles.features}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {features.map((feature, i) => (
            <div key={i} className={styles.featureItem}>
              <feature.icon size={14} />
              <span>{feature.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.errorMessage}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form ou succès */}
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.successMessage}
          >
            <div className={styles.successIconWrap}>
              <CheckCircle size={40} />
            </div>
            <h2>Connexion réussie !</h2>
            <p>Redirection en cours...</p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onSubmit={handleSubmit}
            className={styles.form}
          >
            <div className={styles.formGroup}>
              <label htmlFor="email">Adresse email</label>
              <div
                className={`${styles.inputWrapper} ${
                  focusedField === 'email' ? styles.inputWrapperFocused : ''
                }`}
              >
                <Mail size={18} className={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Mot de passe</label>
              <div
                className={`${styles.inputWrapper} ${
                  focusedField === 'password' ? styles.inputWrapperFocused : ''
                }`}
              >
                <Lock size={18} className={styles.inputIcon} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.formOptions}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Se souvenir de moi</span>
              </label>
              <a href="/forgot-password" className={styles.forgotPassword}>
                Mot de passe oublié ?
              </a>
            </div>

            <motion.button
              type="submit"
              className={styles.loginButton}
              whileHover={isSubmitting ? {} : { scale: 1.01, y: -1 }}
              whileTap={isSubmitting ? {} : { scale: 0.99 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className={styles.loading}>
                  <span className={styles.loader} />
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </motion.button>
          </motion.form>
        )}

        {!isSuccess && (
          <div className={styles.links}>
            <p className={styles.signupLink}>
              Pas encore de compte ? <a href="/signup">Inscrivez-vous</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-blue-50">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-sm text-blue-700">Chargement...</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}