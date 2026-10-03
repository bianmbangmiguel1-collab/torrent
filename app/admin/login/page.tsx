// app/admin/login/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Key,
  Smartphone,
  Loader2,
  Zap,
  Server,
  BarChart3,
} from 'lucide-react'

// ============================================================
// Types de réponses API
// ============================================================
interface AuthUser {
  is_admin?: boolean
  role?: string
}

interface AuthMeResponse {
  user?: AuthUser
}

interface AdminLoginResponse {
  require2FA?: boolean
  error?: string
  message?: string
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@torrenttwist.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [show2FA, setShow2FA] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [require2FA, setRequire2FA] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimer, setLockTimer] = useState(0)

  // ============================================================
  // VÉRIFICATION : DÉJÀ CONNECTÉ EN TANT QU'ADMIN ?
  // ============================================================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) return

        const data: AuthMeResponse = await res.json()
        const u = data?.user

        // ✅ Détection robuste : is_admin OU role === 'admin'
        const isAdmin =
          u?.is_admin === true || u?.role === 'admin'

        if (isAdmin) {
          console.log('✅ Admin déjà connecté → /admin')
          router.replace('/admin')
        }
      } catch (err) {
        // Silence : pas connecté, on continue
      }
    }
    checkAuth()
  }, [router])

  // ============================================================
  // EMAIL SAUVEGARDÉ + VERROUILLAGE
  // ============================================================
  useEffect(() => {
    const savedEmail = localStorage.getItem('adminEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    const attempts = parseInt(localStorage.getItem('loginAttempts') || '0')
    const lockUntil = parseInt(localStorage.getItem('lockUntil') || '0')

    if (lockUntil > Date.now()) {
      setIsLocked(true)
      setLockTimer(Math.ceil((lockUntil - Date.now()) / 60000))

      const interval = setInterval(() => {
        const remaining = Math.ceil((lockUntil - Date.now()) / 60000)
        if (remaining <= 0) {
          setIsLocked(false)
          localStorage.removeItem('lockUntil')
          localStorage.removeItem('loginAttempts')
          clearInterval(interval)
        } else {
          setLockTimer(remaining)
        }
      }, 60000)

      return () => clearInterval(interval)
    }

    setLoginAttempts(attempts)
  }, [])

  // ============================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()

      if (isLocked) {
        setError(`Compte verrouillé. Réessayez dans ${lockTimer} minutes`)
        return
      }

      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email,
            password,
            twoFactorCode: twoFactorCode || undefined,
            rememberMe,
          }),
        })

        // Lecture sécurisée de la réponse
        const contentType = response.headers.get('content-type') || ''
        let data: AdminLoginResponse = {}

        if (contentType.includes('application/json')) {
          data = await response.json()
        } else {
          const text = await response.text()
          throw new Error(text || `Erreur serveur (${response.status})`)
        }

        // ----------------------------------------------------
        // ÉCHEC
        // ----------------------------------------------------
        if (!response.ok) {
          // Cas 2FA requis
          if (data?.require2FA) {
            setRequire2FA(true)
            setShow2FA(true)
            setError(null)
            setLoading(false)
            return
          }

          // Incrémenter les tentatives
          const newAttempts = loginAttempts + 1
          setLoginAttempts(newAttempts)
          localStorage.setItem('loginAttempts', String(newAttempts))

          if (newAttempts >= 5) {
            const lockTime = 15 * 60 * 1000
            localStorage.setItem('lockUntil', String(Date.now() + lockTime))
            setIsLocked(true)
            setLockTimer(15)
            throw new Error(
              'Trop de tentatives échouées. Compte verrouillé pour 15 minutes.'
            )
          }

          throw new Error(
            data?.error || data?.message || 'Erreur de connexion'
          )
        }

        // ----------------------------------------------------
        // SUCCÈS
        // ----------------------------------------------------
        console.log('✅ Connexion admin réussie', data)

        // Réinitialiser les tentatives
        localStorage.removeItem('loginAttempts')
        localStorage.removeItem('lockUntil')

        // Sauvegarder l'email si "se souvenir"
        if (rememberMe) {
          localStorage.setItem('adminEmail', email)
        } else {
          localStorage.removeItem('adminEmail')
        }

        setSuccess('Connexion réussie !')

        // ✅ Redirection vers /admin après un court délai
        setTimeout(() => {
          router.replace('/admin')
        }, 800)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur de connexion')
      } finally {
        setLoading(false)
      }
    },
    [
      email,
      password,
      twoFactorCode,
      rememberMe,
      isLocked,
      lockTimer,
      loginAttempts,
      router,
    ]
  )

  // ============================================================
  // AUTO-SUBMIT DU CODE 2FA À 6 CHIFFRES
  // ============================================================
  useEffect(() => {
    if (show2FA && twoFactorCode.length === 6 && !loading) {
      handleSubmit()
    }
  }, [twoFactorCode, show2FA, loading, handleSubmit])

  // ============================================================
  // MOT DE PASSE OUBLIÉ
  // ============================================================
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email')
      return
    }

    try {
      const response = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data: AdminLoginResponse = await response.json()
      if (response.ok) {
        setSuccess('Un email de réinitialisation a été envoyé')
      } else {
        setError(data.message || "Erreur lors de l'envoi")
      }
    } catch {
      setError("Erreur lors de l'envoi de l'email")
    }
  }

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="admin-login-page">
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />

      <div className="admin-login-shell">
        {/* ============================================================
            PANNEAU GAUCHE — BRANDING
        ============================================================ */}
        <section className="brand-panel">
          <div className="brand-top">
            <div className="brand-logo">
              <Image
                src="/torrent.png"
                alt="TorrentTwist"
                width={46}
                height={46}
                className="brand-logo-image"
              />
            </div>
            <div>
              <div className="brand-name">TorrentTwist</div>
              <div className="brand-admin">ADMIN CENTER</div>
            </div>
          </div>

          <div className="brand-content">
            <div className="status-pill">
              <span className="status-dot" />
              Système opérationnel
            </div>

            <h2>
              Gérez votre
              <span> boutique numérique</span>
              <br />
              avec précision.
            </h2>

            <p>
              Un espace centralisé pour piloter vos produits, vos commandes,
              vos clients et vos performances.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <strong>Sécurité avancée</strong>
                  <span>Protection de votre espace administrateur</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <strong>Analytics en temps réel</strong>
                  <span>Suivez vos ventes et vos performances</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Zap size={18} />
                </div>
                <div>
                  <strong>Gestion intelligente</strong>
                  <span>Un tableau de bord pensé pour aller vite</span>
                </div>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <div className="footer-orbit">
              <div className="orbit-center">
                <Sparkles size={18} />
              </div>
              <span className="orbit-dot dot-a" />
              <span className="orbit-dot dot-b" />
              <span className="orbit-dot dot-c" />
            </div>
            <div>
              <strong>Administration TorrentTwist</strong>
              <span>Contrôle · Performance · Croissance</span>
            </div>
          </div>
        </section>

        {/* ============================================================
            PANNEAU DROIT — FORMULAIRE
        ============================================================ */}
        <section className="form-panel">
          <button
            className="back-btn"
            onClick={() => router.push('/')}
            type="button"
          >
            <ArrowLeft size={18} />
            Retour au site
          </button>

          <div className="form-wrapper">
            {/* Logo mobile */}
            <div className="mobile-logo">
              <div className="mobile-logo-circle">
                <Image
                  src="/torrent.png"
                  alt="TorrentTwist"
                  width={42}
                  height={42}
                />
              </div>
            </div>

            <div className="form-header">
              <div className="secure-badge">
                <Shield size={14} />
                <span>Accès sécurisé</span>
              </div>
              <h1>
                {show2FA
                  ? 'Vérification en deux étapes'
                  : 'Bienvenue dans votre espace'}
              </h1>
              <p>
                {show2FA
                  ? 'Entrez le code de sécurité reçu sur votre appareil.'
                  : 'Connectez-vous pour accéder à votre tableau de bord.'}
              </p>
            </div>

            {/* Alertes */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="alert alert-error"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
                {isLocked && <strong>{lockTimer} min</strong>}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="alert alert-success"
              >
                <CheckCircle size={18} />
                <span>{success}</span>
              </motion.div>
            )}

            {/* =============== FORMULAIRE PRINCIPAL =============== */}
            {!show2FA ? (
              <motion.form
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                onSubmit={handleSubmit}
                className="login-form"
              >
                <div className="field">
                  <label>Email professionnel</label>
                  <div className="field-control">
                    <Mail size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@torrenttwist.com"
                      required
                      disabled={loading || isLocked}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Mot de passe</label>
                  <div className="field-control">
                    <Lock size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      required
                      disabled={loading || isLocked}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading || isLocked}
                      aria-label={
                        showPassword
                          ? 'Masquer le mot de passe'
                          : 'Afficher le mot de passe'
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading || isLocked}
                    />
                    <span>Se souvenir de moi</span>
                  </label>
                  <button
                    type="button"
                    className="forgot"
                    onClick={handleForgotPassword}
                    disabled={loading || isLocked}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  className="submit-btn"
                  whileHover={{ y: loading || isLocked ? 0 : -2 }}
                  whileTap={{ scale: loading || isLocked ? 1 : 0.98 }}
                  disabled={loading || isLocked}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      Connexion...
                    </>
                  ) : isLocked ? (
                    <>
                      <Lock size={18} />
                      Verrouillé {lockTimer} min
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      Se connecter
                    </>
                  )}
                </motion.button>

                <div className="trust-row">
                  <div>
                    <Shield size={15} />
                    Connexion sécurisée
                  </div>
                  <div>
                    <Server size={15} />
                    Données protégées
                  </div>
                  <div>
                    <Zap size={15} />
                    Accès rapide
                  </div>
                </div>
              </motion.form>
            ) : (
              // =============== FORMULAIRE 2FA ===============
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                className="twofa-box"
              >
                <div className="twofa-visual">
                  <div className="twofa-ring">
                    <Smartphone size={28} />
                  </div>
                </div>
                <h3>Code de sécurité</h3>
                <p>Saisissez le code à 6 chiffres pour continuer.</p>

                <div className="field">
                  <label>Code 2FA</label>
                  <div className="field-control">
                    <Key size={18} />
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) =>
                        setTwoFactorCode(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoFocus
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={loading || isLocked}
                    />
                  </div>
                </div>

                <div className="twofa-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShow2FA(false)
                      setRequire2FA(false)
                      setTwoFactorCode('')
                      setError(null)
                    }}
                    disabled={loading}
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={() => handleSubmit()}
                    disabled={
                      loading || isLocked || twoFactorCode.length !== 6
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Vérifier
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            <div className="bottom-note">
              <span>© 2026 TorrentTwist</span>
              <span>Administration sécurisée</span>
            </div>
          </div>
        </section>
      </div>

      {/* ============================================================
          STYLES
      ============================================================ */}
      <style jsx>{`
        .admin-login-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.08), transparent 32%),
            radial-gradient(circle at 90% 90%, rgba(99, 102, 241, 0.08), transparent 28%),
            #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .ambient {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.45;
          animation: ambientFloat 12s ease-in-out infinite;
        }

        .ambient-1 {
          width: 320px;
          height: 320px;
          background: rgba(37, 99, 235, 0.10);
          top: -100px;
          left: -80px;
        }

        .ambient-2 {
          width: 280px;
          height: 280px;
          background: rgba(99, 102, 241, 0.10);
          bottom: -80px;
          right: -70px;
          animation-delay: -5s;
        }

        @keyframes ambientFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -18px); }
        }

        .admin-login-shell {
          width: min(1180px, 100%);
          min-height: 720px;
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          overflow: hidden;
          box-shadow:
            0 30px 80px rgba(15, 23, 42, 0.12),
            0 8px 30px rgba(15, 23, 42, 0.05);
          position: relative;
          z-index: 2;
        }

        .brand-panel {
          position: relative;
          padding: 42px;
          background:
            radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.20), transparent 30%),
            linear-gradient(145deg, #0f172a 0%, #172554 55%, #1d4ed8 100%);
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .brand-panel::before {
          content: '';
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          right: -120px;
          bottom: -110px;
        }

        .brand-panel::after {
          content: '';
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.06);
          right: -60px;
          bottom: -50px;
        }

        .brand-top {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 2;
        }

        .brand-logo {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .brand-logo-image {
          object-fit: contain;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .brand-admin {
          font-size: 10px;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.55);
          margin-top: 3px;
        }

        .brand-content {
          position: relative;
          z-index: 2;
          max-width: 470px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.10);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 0 5px rgba(74, 222, 128, 0.12);
          animation: pulseDot 2s ease-in-out infinite;
        }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }

        .brand-content h2 {
          margin: 24px 0 14px;
          font-size: clamp(34px, 4vw, 52px);
          line-height: 1.04;
          letter-spacing: -0.045em;
          font-weight: 800;
        }

        .brand-content h2 span {
          color: #93c5fd;
        }

        .brand-content > p {
          color: rgba(255, 255, 255, 0.65);
          font-size: 15px;
          line-height: 1.7;
          max-width: 430px;
        }

        .feature-list {
          margin-top: 28px;
          display: grid;
          gap: 13px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .feature-item strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
        }

        .feature-item span {
          display: block;
          margin-top: 2px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }

        .brand-footer {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 2;
        }

        .brand-footer strong {
          display: block;
          font-size: 12px;
        }

        .brand-footer span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.42);
        }

        .footer-orbit {
          width: 46px;
          height: 46px;
          position: relative;
          border-radius: 50%;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          animation: orbitSpin 10s linear infinite;
        }

        .orbit-center {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.10);
          animation: orbitSpinReverse 10s linear infinite;
        }

        .orbit-dot {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #93c5fd;
        }

        .dot-a { top: 0; left: 20px; }
        .dot-b { right: 0; top: 20px; }
        .dot-c { bottom: 0; left: 20px; }

        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes orbitSpinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        .form-panel {
          background: #ffffff;
          padding: 36px 54px;
          display: flex;
          flex-direction: column;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: none;
          color: #64748b;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          transition: color 0.2s ease, transform 0.2s ease;
          align-self: flex-start;
        }

        .back-btn:hover {
          color: #2563eb;
          transform: translateX(-3px);
        }

        .form-wrapper {
          width: min(420px, 100%);
          margin: auto;
        }

        .mobile-logo {
          display: none;
        }

        .form-header {
          margin-bottom: 30px;
        }

        .secure-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 18px;
        }

        .form-header h1 {
          font-size: 32px;
          line-height: 1.15;
          letter-spacing: -0.04em;
          margin: 0;
          color: #0f172a;
          font-weight: 800;
        }

        .form-header p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.7;
          color: #64748b;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          margin-bottom: 18px;
          font-size: 13px;
        }

        .alert strong {
          margin-left: auto;
        }

        .alert-error {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .alert-success {
          color: #15803d;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .login-form {
          display: grid;
          gap: 18px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field label {
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .field-control {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #94a3b8;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.2s ease;
        }

        .field-control:focus-within {
          background: #ffffff;
          border-color: #93c5fd;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.08),
            0 10px 25px rgba(37, 99, 235, 0.06);
          transform: translateY(-1px);
        }

        .field-control input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #0f172a;
          font-size: 14px;
          min-width: 0;
        }

        .field-control input::placeholder {
          color: #94a3b8;
        }

        .field-control input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .password-toggle:hover:not(:disabled) {
          color: #2563eb;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
        }

        .remember input {
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
        }

        .forgot {
          border: none;
          background: none;
          color: #2563eb;
          font-size: 13px;
          cursor: pointer;
        }

        .forgot:hover {
          text-decoration: underline;
        }

        .submit-btn {
          min-height: 54px;
          border: none;
          border-radius: 14px;
          color: #ffffff;
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          box-shadow: 0 20px 38px rgba(37, 99, 235, 0.24);
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .trust-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 6px;
        }

        .trust-row div {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: #94a3b8;
          padding: 9px 5px;
          border: 1px solid #eef2f7;
          background: #fbfdff;
          border-radius: 10px;
        }

        .twofa-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
        }

        .twofa-visual {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .twofa-ring {
          width: 70px;
          height: 70px;
          border-radius: 22px;
          background: linear-gradient(135deg, #eff6ff, #eef2ff);
          border: 1px solid #dbeafe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: softPulse 2.4s ease-in-out infinite;
        }

        @keyframes softPulse {
          0%, 100% {
            transform: translateY(0);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.06);
          }
          50% {
            transform: translateY(-3px);
            box-shadow: 0 0 0 12px rgba(37, 99, 235, 0.03);
          }
        }

        .twofa-box h3 {
          margin: 0;
          text-align: center;
          font-size: 20px;
          color: #0f172a;
        }

        .twofa-box > p {
          text-align: center;
          color: #64748b;
          font-size: 13px;
          margin: 8px 0 22px;
        }

        .twofa-actions {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 10px;
          margin-top: 18px;
        }

        .secondary-btn {
          min-height: 50px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .secondary-btn:hover:not(:disabled) {
          background: #f8fafc;
        }

        .secondary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .bottom-note {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          color: #cbd5e1;
          font-size: 11px;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .admin-login-page { padding: 18px; }
          .admin-login-shell {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .brand-panel {
            min-height: 320px;
            padding: 28px;
          }
          .brand-content h2 { font-size: 36px; }
          .brand-footer { margin-top: 30px; }
          .form-panel { padding: 28px; }
        }

        @media (max-width: 560px) {
          .admin-login-page { padding: 0; }
          .admin-login-shell {
            border-radius: 0;
            min-height: 100vh;
            border: none;
          }
          .brand-panel { display: none; }
          .form-panel {
            padding: 24px 18px;
            justify-content: center;
          }
          .mobile-logo {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          .mobile-logo-circle {
            width: 68px;
            height: 68px;
            border-radius: 20px;
            background: #eff6ff;
            border: 1px solid #dbeafe;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .form-header h1 { font-size: 27px; }
          .trust-row { grid-template-columns: 1fr; }
          .bottom-note {
            flex-direction: column;
            gap: 5px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}