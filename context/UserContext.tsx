// context/UserContext.tsx
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'

// ============================================================
// TYPES
// ============================================================

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  refreshUser: () => Promise<User | null>
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

interface AuthMeResponse {
  success?: boolean
  user?: User
}

interface LoginResponse {
  user?: User
  error?: string
  message?: string
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// ============================================================
// HELPERS
// ============================================================

function checkIsAdmin(u: User | null): boolean {
  if (!u) return false

  const candidate = u as User & {
    is_admin?: boolean
    role?: string
  }

  return candidate.is_admin === true || candidate.role === 'admin'
}

// ============================================================
// PROVIDER
// ============================================================

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Protection contre les appels multiples simultanés
  const fetchRef = useRef(false)

  // ------------------------------------------------------------
  // 1. Marquer le composant comme monté (évite les warnings SSR)
  // ------------------------------------------------------------
  useEffect(() => {
    setMounted(true)
  }, [])

  // ------------------------------------------------------------
  // 2. Récupérer l'utilisateur depuis /api/auth/me
  // ------------------------------------------------------------
  const fetchUser = useCallback(async (): Promise<User | null> => {
    if (fetchRef.current) return null
    fetchRef.current = true

    try {
      console.log('🔍 Vérification de l\'authentification...')

      // ✅ URL RELATIVE : même domaine → cookies httpOnly partagés
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      console.log('📊 Status /api/auth/me:', res.status)

      if (res.status === 401) {
        console.log('❌ Non authentifié')
        setUser(null)
        return null
      }

      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`)
      }

      const data = (await res.json()) as AuthMeResponse
      console.log('✅ Réponse /api/auth/me:', data)

      if (data.success && data.user) {
        setUser(data.user)
        console.log(
          '✅ Utilisateur authentifié:',
          data.user.email,
          '| is_admin:',
          'is_admin' in data.user ? data.user.is_admin : undefined,
          '| role:',
          'role' in data.user ? data.user.role : undefined
        )
        return data.user
      }

      console.log('❌ Données utilisateur manquantes')
      setUser(null)
      return null
    } catch (error) {
      console.error('❌ Erreur fetchUser:', error)
      setUser(null)
      return null
    } finally {
      setLoading(false)
      fetchRef.current = false
    }
  }, [])

  // ------------------------------------------------------------
  // 3. Rafraîchir l'utilisateur (utile après login/2FA)
  // ------------------------------------------------------------
  const refreshUser = useCallback(async (): Promise<User | null> => {
    setLoading(true)
    const u = await fetchUser()
    return u
  }, [fetchUser])

  // ------------------------------------------------------------
  // 4. Connexion client — NE REDIRIGE PAS
  //    La redirection est décidée par la page (login, admin/login, etc.)
  // ------------------------------------------------------------
  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      console.log('🔑 Tentative de connexion client...')

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      console.log('📊 Status /api/auth/login:', response.status)

      if (!response.ok) {
        let errMsg = 'Erreur de connexion'
        try {
          const error = (await response.json()) as LoginResponse
          errMsg = error.error || error.message || errMsg
        } catch {
          // ignore
        }
        throw new Error(errMsg)
      }

      const data = (await response.json()) as LoginResponse
      console.log('✅ Connexion réussie:', data.user?.email)

      if (!data.user) {
        throw new Error('Données utilisateur manquantes')
      }

      // ✅ Mettre à jour le state localement
      setUser(data.user)

      // ✅ Puis re-vérifier côté serveur (au cas où)
      //    Utile pour récupérer is_admin à jour
      const fresh = await fetchUser()
      return fresh || data.user
    },
    [fetchUser]
  )

  // ------------------------------------------------------------
  // 5. Déconnexion
  // ------------------------------------------------------------
  const logout = useCallback(async (): Promise<void> => {
    console.log('🚪 Déconnexion...')

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      console.log('✅ Déconnexion réussie')
    } catch (e) {
      console.warn('⚠️ Erreur logout:', e)
    } finally {
      // Nettoyer tout
      localStorage.removeItem('user')
      localStorage.removeItem('dashboardStats')
      localStorage.removeItem('adminEmail')
      setUser(null)
      router.push('/login')
    }
  }, [router])

  // ------------------------------------------------------------
  // 6. Chargement initial
  // ------------------------------------------------------------
  useEffect(() => {
    if (!mounted) return

    // Affichage instantané depuis le cache (optionnel)
    const cachedUser = localStorage.getItem('user')
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser)
        setUser(parsed)
        console.log('📦 Utilisateur chargé depuis le cache')
      } catch {
        localStorage.removeItem('user')
      }
    }

    // ✅ Vérification serveur (source de vérité)
    fetchUser()
  }, [mounted, fetchUser])

  // ------------------------------------------------------------
  // 7. Valeur du contexte
  // ------------------------------------------------------------
  const value: UserContextType = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: checkIsAdmin(user),
    refreshUser,
    login,
    logout,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// ============================================================
// HOOK
// ============================================================

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}