// app/admin/settings/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Power, AlertTriangle, CheckCircle, Loader2, Lock, LogOut } from 'lucide-react'

// ============================================================
// Types de réponses API
// ============================================================
interface RevokeTokensResponse {
  error?: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleRevokeTokens = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = (await response.json()) as RevokeTokensResponse

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la révocation')
      }

      setMessage({
        type: 'success',
        text: '✅ Tous les tokens ont été révoqués. Vous allez être redirigé vers la page de connexion.'
      })

      // Rediriger vers login après 2 secondes
      setTimeout(() => {
        router.push('/admin/login')
        router.refresh()
      }, 2000)

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la révocation des tokens'
      })
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">⚙️ Paramètres de sécurité</h1>
        <p className="text-gray-400">Gérez la sécurité de votre compte administrateur</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-900/30 border border-green-500 text-green-400' : 'bg-red-900/30 border border-red-500 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Carte de révocation */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">🔒 Révocation des tokens</h2>
            <p className="text-gray-400 text-sm mt-1">
              Cette action révoque tous les tokens de session actifs. 
              Vous devrez vous reconnecter sur tous vos appareils.
            </p>
            <ul className="text-sm text-gray-400 mt-3 space-y-1">
              <li>• Tous les tokens JWT seront invalidés</li>
              <li>• Vous serez déconnecté de tous les appareils</li>
              <li>• Vous devrez vous reconnecter</li>
            </ul>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                Révoquer tous les tokens
              </button>
            ) : (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Confirmation requise</span>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Êtes-vous sûr de vouloir révoquer tous vos tokens ?
                  Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRevokeTokens}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Révocation en cours...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Confirmer la révocation
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informations de sécurité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Token actif</p>
              <p className="text-xs text-gray-400">Valide pour 1000 ans</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sécurité renforcée</p>
              <p className="text-xs text-gray-400">HttpOnly, Secure, SameSite</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton déconnexion */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}