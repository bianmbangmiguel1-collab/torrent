// lib/auth.ts
import * as jose from 'jose'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { NextRequest } from 'next/server'
import { getDB } from './db'

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET =
  process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || '100000y'

const BCRYPT_SALT_ROUNDS = 10

// ============================================
// TYPES
// ============================================

export interface User {
  id: string | number
  email: string
  name: string
  role: 'admin' | 'user' | 'moderator'
  isAdmin?: boolean
  isVerified?: boolean
  phone?: string
  bio?: string
  address?: string
  city?: string
  country?: string
  postalCode?: string
  avatar?: string
  preferences?: Record<string, any>
  mainGoal?: string
  interests?: string[]
  experienceLevel?: string
  profileCompleteness?: number
  onboardingCompleted?: boolean
  onboardingStep?: number
  engagementScore?: number
  totalTimeSpent?: number
  lastActivity?: Date
  createdAt?: Date
  updatedAt?: Date
  lastLogin?: Date
  isActive?: boolean
}

export interface TokenPayload {
  id: string | number
  userId: string | number
  sub?: string | number
  email: string
  name: string
  role: string
  isAdmin: boolean
  phone?: string
  isVerified?: boolean
  iat?: number
  exp?: number
  created?: number
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: Partial<User>
  error?: string
  message?: string
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  role?: 'admin' | 'user' | 'moderator'
}

// ⭐ Type utilisé par getUserFromRequest
export interface AuthUser {
  id: number
  email?: string
  name?: string
  role?: string
  is_admin?: number
}

interface AuthRequest {
  cookies?: {
    get: (name: string) => { value?: string } | undefined
  }
  headers?: {
    get: (name: string) => string | null
  }
}

// ============================================
// JWT FUNCTIONS
// ============================================

export async function signToken(user: User): Promise<string> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)

    const payload: TokenPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role || 'user',
      isAdmin: user.role === 'admin' || user.isAdmin === true,
      isVerified: user.isVerified === true,
      created: Date.now(),
    }

    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(secret)

    return token
  } catch (error) {
    console.error('Erreur lors de la génération du token:', error)
    throw new Error('Impossible de générer le token')
  }
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    if (!token || typeof token !== 'string') {
      console.error("❌ verifyToken: le token fourni n'est pas une chaîne")
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('❌ verifyToken: format JWT invalide')
      return null
    }

    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    return payload as unknown as TokenPayload
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      console.error('Token expiré')
    } else if (error instanceof jose.errors.JWTInvalid) {
      console.error('Token JWT invalide')
    } else {
      console.error('Erreur de vérification du token:', error)
    }
    return null
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null
    const { payload } = jose.decodeJwt(token)
    return payload as unknown as TokenPayload
  } catch (error) {
    console.error('Erreur de décodage du token:', error)
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) return true
    const expDate = new Date(decoded.exp * 1000)
    return expDate < new Date()
  } catch {
    return true
  }
}

export function getTokenRemainingTime(token: string): number | null {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) return null
    const expDate = new Date(decoded.exp * 1000)
    const now = new Date()
    return Math.max(0, expDate.getTime() - now.getTime())
  } catch {
    return null
  }
}

export async function refreshToken(oldToken: string): Promise<string | null> {
  try {
    const payload = await verifyToken(oldToken)
    if (!payload) return null
    if (isTokenExpired(oldToken)) return null

    const user: User = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role as 'admin' | 'user' | 'moderator',
      isAdmin: payload.isAdmin,
      isVerified: payload.isVerified,
    }

    return await signToken(user)
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error)
    return null
  }
}

// ============================================
// PASSWORD FUNCTIONS
// ============================================

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS)
    return await bcrypt.hash(password, salt)
  } catch (error) {
    console.error('Erreur lors du hashage du mot de passe:', error)
    throw new Error('Impossible de hasher le mot de passe')
  }
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error('Erreur lors de la comparaison des mots de passe:', error)
    return false
  }
}

export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
  score: number
} {
  const errors: string[] = []
  let score = 0

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères')
  } else {
    score += 1
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule')
  } else {
    score += 1
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule')
  } else {
    score += 1
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre')
  } else {
    score += 1
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial')
  } else {
    score += 1
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(score, 5),
  }
}

export function generateSecurePassword(length: number = 16): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'
  let password = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }
  return password
}

// ============================================
// SESSION FUNCTIONS
// ============================================

export function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

export function isValidSession(sessionId: string, lastActivity: Date): boolean {
  const SESSION_TIMEOUT = 30 * 60 * 1000
  const now = new Date()
  const diff = now.getTime() - lastActivity.getTime()
  return diff < SESSION_TIMEOUT
}

// ============================================
// AUTHENTICATION HELPERS
// ============================================

export function isAdmin(user: User | TokenPayload | null): boolean {
  if (!user) return false
  return user.role === 'admin' || user.isAdmin === true
}

export function isModerator(user: User | TokenPayload | null): boolean {
  if (!user) return false
  return user.role === 'moderator' || user.role === 'admin'
}

export function hasRole(
  user: User | TokenPayload | null,
  roles: string | string[]
): boolean {
  if (!user) return false
  const roleList = Array.isArray(roles) ? roles : [roles]
  return roleList.includes(user.role || 'user')
}

export function sanitizeUser(user: User): Partial<User> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    phone: user.phone,
    bio: user.bio,
    address: user.address,
    city: user.city,
    country: user.country,
    postalCode: user.postalCode,
    avatar: user.avatar,
    preferences: user.preferences,
    mainGoal: user.mainGoal,
    interests: user.interests,
    experienceLevel: user.experienceLevel,
    profileCompleteness: user.profileCompleteness,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    engagementScore: user.engagementScore,
    totalTimeSpent: user.totalTimeSpent,
    lastActivity: user.lastActivity,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  }
}

// ============================================
// USER DATA HELPERS
// ============================================

export function getUserId(payload: any): number | null {
  return payload?.id || payload?.userId || payload?.sub || null
}

export function getUserEmail(payload: any): string | null {
  return payload?.email || null
}

export function getUserName(payload: any): string | null {
  return payload?.name || null
}

// ============================================
// TOKEN EXTRACTION
// ============================================

export function extractToken(
  source: string | AuthRequest | null | undefined
): string | null {
  if (typeof source === 'string') {
    return source.trim() || null
  }
  if (!source) return null

  const adminSession = source.cookies?.get('admin_session')?.value
  if (adminSession && typeof adminSession === 'string') return adminSession

  const userSession = source.cookies?.get('user_session')?.value
  if (userSession && typeof userSession === 'string') return userSession

  const token = source.cookies?.get('token')?.value
  if (token && typeof token === 'string') return token

  const authorization = source.headers?.get('Authorization')
  if (authorization && typeof authorization === 'string') {
    if (authorization.toLowerCase().startsWith('bearer ')) {
      const bearerToken = authorization.slice(7).trim()
      if (bearerToken) return bearerToken
    }
  }

  return null
}

// ============================================
// VERIFY ADMIN
// ============================================

export async function verifyAdmin(
  source: string | AuthRequest | null | undefined
): Promise<boolean> {
  try {
    const token = extractToken(source)
    if (!token || typeof token !== 'string') {
      console.log('❌ verifyAdmin: aucun token JWT trouvé')
      return false
    }

    const payload = await verifyToken(token)
    if (!payload) {
      console.log('❌ verifyAdmin: token JWT invalide')
      return false
    }

    const userId = getUserId(payload)
    if (!userId) {
      console.log('❌ verifyAdmin: aucun userId dans le token')
      return false
    }

    const db = await getDB()
    const user = await db.get(
      `SELECT id, is_admin AS isAdmin, role, is_active AS isActive
       FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      console.log(`❌ verifyAdmin: utilisateur ${userId} introuvable`)
      return false
    }

    if (
      user.isActive !== undefined &&
      user.isActive !== null &&
      Number(user.isActive) === 0
    ) {
      console.log(`❌ verifyAdmin: utilisateur ${userId} désactivé`)
      return false
    }

    const admin =
      Number(user.isAdmin) === 1 ||
      user.role === 'admin' ||
      payload.role === 'admin' ||
      payload.isAdmin === true

    if (!admin) {
      console.log(`❌ verifyAdmin: ${payload.email || userId} n'est pas administrateur`)
      return false
    }

    console.log(`✅ verifyAdmin: administrateur ${payload.email || userId} authentifié`)
    return true
  } catch (error) {
    console.error('❌ Erreur dans verifyAdmin:', error)
    return false
  }
}

// ============================================
// REQUIRE ADMIN
// ============================================

export async function requireAdmin(
  source: string | AuthRequest | null | undefined
): Promise<TokenPayload> {
  const token = extractToken(source)
  if (!token || typeof token !== 'string') {
    throw new Error('Authentification requise')
  }

  const payload = await verifyToken(token)
  if (!payload) throw new Error('Token invalide')

  const userId = getUserId(payload)
  if (!userId) throw new Error('Utilisateur invalide')

  const db = await getDB()
  const user = await db.get(
    `SELECT id, is_admin AS isAdmin, role, is_active AS isActive
     FROM users WHERE id = ?`,
    [userId]
  )

  if (!user) throw new Error('Utilisateur introuvable')

  if (
    user.isActive !== undefined &&
    user.isActive !== null &&
    Number(user.isActive) === 0
  ) {
    throw new Error('Compte désactivé')
  }

  const admin =
    Number(user.isAdmin) === 1 ||
    user.role === 'admin' ||
    payload.role === 'admin' ||
    payload.isAdmin === true

  if (!admin) throw new Error('Privilèges administrateur requis')

  return payload
}

// ============================================
// GENERATE TOKEN - Fonction unifiée
// ============================================

export async function generateToken(
  user: any,
  expiresIn: string = '100000y'
): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const token = await new jose.SignJWT({
    userId: user.id,
    id: user.id,
    email: user.email,
    name: user.name || 'Utilisateur',
    role: user.role || 'user',
    isAdmin:
      user.is_admin === 1 || user.isAdmin === 1 || user.isAdmin === true,
    isVerified:
      user.is_verified === 1 ||
      user.isVerified === 1 ||
      user.isVerified === true,
    created: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)

  return token
}

// ============================================
// GET USER FROM TOKEN
// ============================================

export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const payload = await verifyToken(token)
    if (!payload) return null

    const userId = getUserId(payload)
    if (!userId) return null

    const db = await getDB()
    const user = await db.get(
      `SELECT
        id, name, email, phone, bio, address, city, country,
        postal_code AS postalCode, avatar, role,
        is_admin AS isAdmin, is_verified AS isVerified,
        main_goal AS mainGoal, interests,
        experience_level AS experienceLevel,
        profile_completeness AS profileCompleteness,
        onboarding_completed AS onboardingCompleted,
        onboarding_step AS onboardingStep,
        engagement_score AS engagementScore,
        total_time_spent AS totalTimeSpent,
        last_activity AS lastActivity,
        preferences,
        created_at AS createdAt,
        updated_at AS updatedAt,
        last_login AS lastLogin
       FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) return null

    if (user.interests && typeof user.interests === 'string') {
      try {
        user.interests = JSON.parse(user.interests)
      } catch {
        user.interests = []
      }
    }

    if (user.preferences && typeof user.preferences === 'string') {
      try {
        user.preferences = JSON.parse(user.preferences)
      } catch {
        user.preferences = {}
      }
    }

    return user
  } catch (error) {
    console.error('Erreur dans getUserFromToken:', error)
    return null
  }
}

// ============================================
// ⭐ GET USER FROM REQUEST (utilisé par /api/goals, etc.)
// ============================================

export async function getUserFromRequest(
  req: Request | NextRequest
): Promise<AuthUser | null> {
  try {
    let token: string | null = null

    const anyReq = req as any
    if (anyReq.cookies?.get) {
      token =
        anyReq.cookies.get('user_session')?.value ||
        anyReq.cookies.get('token')?.value ||
        null
    }

    if (!token) {
      const authHeader = req.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim()
      }
    }

    if (!token) return null

    const parts = token.split('.')
    if (parts.length < 2) return null

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)

    const userId = decoded?.id || decoded?.userId
    if (!userId) return null

    const db = await getDB()
    const user = await db.get(
      `SELECT id, name, email, role, is_admin, is_active, banned
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    )

    if (!user) return null
    if (user.is_active === 0) return null
    if (user.banned === 1) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_admin: user.is_admin,
    }
  } catch (err) {
    console.warn('⚠️ getUserFromRequest :', err)
    return null
  }
}

/**
 * Variante synchrone : extrait juste l'ID depuis le JWT, sans vérif DB.
 */
export function getUserIdFromTokenSync(
  req: Request | NextRequest
): number | null {
  try {
    const anyReq = req as any
    const token =
      anyReq.cookies?.get?.('user_session')?.value ||
      anyReq.cookies?.get?.('token')?.value ||
      (req.headers.get('authorization') || '')
        .replace(/^Bearer\s+/, '')
        .trim()

    if (!token) return null

    const parts = token.split('.')
    if (parts.length < 2) return null

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    )
    const id = payload?.id || payload?.userId
    return id ? Number(id) : null
  } catch {
    return null
  }
}

// ============================================
// TOKEN_CONFIG
// ============================================

export const TOKEN_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 100000 * 365 * 24 * 60 * 60,
  path: '/',
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitData {
  count: number
  resetAt: Date
}

const rateLimitStore = new Map<string, RateLimitData>()

export function checkRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): {
  isLimited: boolean
  remaining: number
  resetIn: number
} {
  const now = new Date()
  const data = rateLimitStore.get(ip)

  if (!data || data.resetAt < now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: new Date(now.getTime() + windowMs),
    })
    return { isLimited: false, remaining: maxRequests - 1, resetIn: windowMs }
  }

  if (data.count >= maxRequests) {
    return {
      isLimited: true,
      remaining: 0,
      resetIn: data.resetAt.getTime() - now.getTime(),
    }
  }

  data.count += 1
  return {
    isLimited: false,
    remaining: maxRequests - data.count,
    resetIn: data.resetAt.getTime() - now.getTime(),
  }
}

export function cleanRateLimitStore(): void {
  const now = new Date()
  for (const [key, data] of Array.from(rateLimitStore.entries())) {
    if (data.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanRateLimitStore, 60 * 60 * 1000)
}

// ============================================
// FORMATAGE DES DONNÉES UTILISATEUR
// ============================================

export function formatUserForAPI(user: any): User {
  let interests: string[] = []
  let preferences: Record<string, any> = {}

  if (typeof user.interests === 'string') {
    try {
      interests = JSON.parse(user.interests)
    } catch {
      interests = []
    }
  } else {
    interests = user.interests || []
  }

  if (typeof user.preferences === 'string') {
    try {
      preferences = JSON.parse(user.preferences)
    } catch {
      preferences = {}
    }
  } else {
    preferences = user.preferences || {}
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    bio: user.bio || null,
    address: user.address || null,
    city: user.city || null,
    country: user.country || null,
    postalCode: user.postal_code || user.postalCode || null,
    avatar: user.avatar || null,
    role: user.role || 'user',
    isAdmin:
      user.is_admin === 1 || user.isAdmin === 1 || user.isAdmin === true,
    isVerified:
      user.is_verified === 1 ||
      user.isVerified === 1 ||
      user.isVerified === true,
    mainGoal: user.main_goal || user.mainGoal || null,
    interests,
    experienceLevel: user.experience_level || user.experienceLevel || null,
    profileCompleteness:
      user.profile_completeness || user.profileCompleteness || 0,
    onboardingCompleted:
      user.onboarding_completed === 1 || user.onboardingCompleted === true,
    onboardingStep: user.onboarding_step || user.onboardingStep || 0,
    engagementScore: user.engagement_score || user.engagementScore || 0,
    totalTimeSpent: user.total_time_spent || user.totalTimeSpent || 0,
    lastActivity: user.last_activity || user.lastActivity || null,
    preferences,
    createdAt: user.created_at || user.createdAt,
    updatedAt: user.updated_at || user.updatedAt,
    lastLogin: user.last_login || user.lastLogin,
  }
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
  // JWT
  signToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenRemainingTime,
  refreshToken,

  // Password
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateSecurePassword,

  // Session
  generateSessionId,
  isValidSession,

  // Auth
  isAdmin,
  isModerator,
  hasRole,
  sanitizeUser,

  getUserId,
  getUserEmail,
  getUserName,

  // Token extraction
  extractToken,

  // Admin
  verifyAdmin,
  requireAdmin,

  // Token
  generateToken,
  getUserFromToken,

  // ⭐ AJOUTÉS
  getUserFromRequest,
  getUserIdFromTokenSync,

  // Config
  TOKEN_CONFIG,

  // Rate Limit
  checkRateLimit,
}