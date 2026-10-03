// middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jose from 'jose'

// ============================================================
// CONFIGURATION
// ============================================================

const JWT_SECRET =
  process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

const PUBLIC_ROUTES = [
  // Pages
  '/',
  '/avant',
  '/products',
  '/product',
  '/category',
  '/categories',
  '/login',
  '/signup',
  '/register',
  '/signin',
  '/about',
  '/contact',
  '/faq',
  '/pricing',
  '/blog',
  '/checkout',

  // Admin login
  '/admin/login',

  // Auth API
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',

  // Admin auth
  '/api/admin/login',
  '/api/admin/revoke',

  // Public product/category API
  '/api/products',
  '/api/categories',

  // Public review GET
  '/api/reviews',
  '/api/reviews/featured',
  '/api/reviews/track',

  // Public upload / health / webhooks
  '/api/uploads',
  '/api/health',
  '/api/webhooks',
  '/api/webhooks/leekpay',
  '/api/webhooks/fedapay',

  // Onboarding
  '/api/onboarding',
  '/api/onboarding/step1-goal',
  '/api/onboarding/step2-interests',
  '/api/onboarding/step3-experience',
  '/api/onboarding/complete',

  // Paiement (public)
  '/payment/success',
  '/payment/cancel',
  '/payment/checkout',

  // NOUVELLES ROUTES PAIEMENT (PUBLIC)
  '/api/payments/confirm',
  '/api/payments/webhook/fedapay',
  '/api/payments/webhook/leekpay',

  // NOUVELLES ROUTES COMMANDES (PUBLIC)
  '/api/orders/download',

  // Download
  '/download',

  // Assets
  '/_next',
  '/favicon.ico',
  '/torrent.png',
  '/images',
  '/uploads',
  '/fonts',
]

// ============================================================
// ROUTES ADMIN
// ============================================================

const ADMIN_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/products',
  '/admin/orders',
  '/admin/users',
  '/admin/reviews',
  '/admin/categories',
  '/admin/stock',
  '/admin/acquisition',
  '/admin/marketing',
  '/admin/ai',
  '/admin/finances',
  '/admin/security',
  '/admin/settings',
  '/admin/profile',
  '/admin/analytics',
  '/admin/reports',
  '/admin/integrations',
  '/admin/promotions',
  '/admin/newsletter',
  '/admin/templates',
]

const API_ADMIN_ROUTES = [
  '/api/admin',
  '/api/ai',
  '/api/admin/products/upload-images',
]

// ============================================================
// ROUTES UTILISATEUR PROTÉGÉES
// ============================================================

const USER_PROTECTED_ROUTES = [
  // Pages
  '/cart',
  '/orders',
  '/favorites',
  '/invoices',
  '/notifications',
  '/profile',
  '/settings',
  '/dashboard',

  // API
  '/api/cart',
  '/api/cart/add',
  '/api/cart/update',
  '/api/cart/remove',
  '/api/cart/clear',
  '/api/orders',
  '/api/orders/create',
  '/api/favorites',
  '/api/favorites/add',
  '/api/favorites/remove',
  '/api/invoices',
  '/api/invoices/:id',
  '/api/invoices/download/:id',
  '/api/notifications',
  '/api/notifications/:id/read',
  '/api/notifications/read-all',
  '/api/profile',
  '/api/profile/update',
  '/api/payments/create',
]

// ============================================================
// HELPERS
// ============================================================

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
}

function isAdminRoute(pathname: string) {
  // Les pages de login admin sont publiques
  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/revoke'
  ) {
    return false
  }

  return (
    ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`)) ||
    API_ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
  )
}

function isUserProtectedRoute(pathname: string) {
  // Pages exactes
  if (USER_PROTECTED_ROUTES.includes(pathname)) return true

  // Pages avec paramètres dynamiques
  if (pathname.startsWith('/orders/') && pathname !== '/orders') return true
  if (pathname.startsWith('/invoices/') && pathname !== '/invoices') return true
  if (pathname.startsWith('/favorites/') && pathname !== '/favorites') return true
  if (pathname.startsWith('/notifications/') && pathname !== '/notifications') return true

  // API avec paramètres
  for (const route of USER_PROTECTED_ROUTES) {
    if (route.includes(':id') && pathname.match(new RegExp('^' + route.replace(':id', '\\d+') + '$'))) {
      return true
    }
  }

  return false
}

function isApiRoute(pathname: string) {
  return pathname.startsWith('/api/')
}

function isProductReviewRoute(pathname: string) {
  return /^\/api\/products\/[^/]+\/reviews(?:\/.*)?$/.test(pathname)
}

// ============================================================
// JWT
// ============================================================

async function verifyToken(token: string) {
  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    if (isDevelopment) {
      console.warn('⚠️ Token invalide:', error instanceof Error ? error.message : error)
    }
    return null
  }
}

// ============================================================
// API ERROR
// ============================================================

function createApiErrorResponse(message: string, status = 401) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

// ============================================================
// MIDDLEWARE
// ============================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  if (isDevelopment) {
    console.log(`[${new Date().toISOString()}] ${method} ${pathname} (::1)`)
  }

  // ==========================================================
  // 1. OPTIONS (CORS)
  // ==========================================================

  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }

  // ==========================================================
  // 2. ADMIN LOGIN (public)
  // ==========================================================

  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/revoke'
  ) {
    if (pathname === '/admin/login') {
      const adminToken = request.cookies.get('admin_session')?.value
      if (adminToken) {
        const payload = await verifyToken(adminToken)
        if (payload && (payload.role === 'admin' || payload.isAdmin === true || payload.is_admin === true || payload.is_admin === 1)) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return NextResponse.redirect(url)
        }
      }
    }
    return NextResponse.next()
  }

  // ==========================================================
  // 3. API REVIEWS PRODUITS (public)
  // ==========================================================
  // En développement, aucune CSP n'est posée ici.
  // Next.js gère son propre HMR sans avoir besoin de webpack://_N_E.

  if (isProductReviewRoute(pathname)) {
    return NextResponse.next()
  }

  // ==========================================================
  // 4. ROUTES PUBLIQUES
  // ==========================================================

  if (isPublicRoute(pathname)) {
    if (pathname === '/login') {
      const adminToken = request.cookies.get('admin_session')?.value
      if (adminToken) {
        const payload = await verifyToken(adminToken)
        if (payload) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return NextResponse.redirect(url)
        }
      }

      const userToken = request.cookies.get('user_session')?.value
      if (userToken) {
        const payload = await verifyToken(userToken)
        if (payload) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      }
    }

    // ⚠️ CORRECTION : plus de CSP en dev (Next.js injecte ce qu'il faut).
    // En production, la CSP stricte est posée par `next.config.js`.
    return NextResponse.next()
  }

  // ==========================================================
  // 5. RÉCUPÉRATION DU TOKEN
  // ==========================================================

  let token = request.cookies.get('admin_session')?.value

  if (!token) {
    token = request.cookies.get('user_session')?.value
  }

  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    token = request.cookies.get('token')?.value
  }

  if (isDevelopment) {
    console.log(`🔑 Token trouvé: ${token ? 'OUI' : 'NON'} pour ${pathname}`)
  }

  let payload: any = null
  if (token) {
    payload = await verifyToken(token)
  }

  // ==========================================================
  // 6. ADMIN ROUTES
  // ==========================================================

  if (isAdminRoute(pathname)) {
    if (!payload) {
      if (isApiRoute(pathname)) {
        return createApiErrorResponse('Authentification requise', 401)
      }
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    const isAdmin = payload.role === 'admin' || payload.isAdmin === true || payload.is_admin === true || payload.is_admin === 1

    if (!isAdmin) {
      if (isApiRoute(pathname)) {
        return createApiErrorResponse('Privilèges administrateur requis', 403)
      }
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    if (isApiRoute(pathname)) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-admin-id', String(payload.id || payload.sub || payload.userId || ''))
      requestHeaders.set('x-admin-email', String(payload.email || ''))
      requestHeaders.set('x-admin-name', String(payload.name || ''))
      requestHeaders.set('x-admin-role', 'admin')
      requestHeaders.set('x-admin-auth', 'true')

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    return NextResponse.next()
  }

  // ==========================================================
  // 7. ROUTES UTILISATEUR PROTÉGÉES
  // ==========================================================

  if (isUserProtectedRoute(pathname)) {
    if (!payload) {
      if (isApiRoute(pathname)) {
        return createApiErrorResponse('Authentification requise', 401)
      }
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    if (isApiRoute(pathname)) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', String(payload.id || payload.sub || payload.userId || ''))
      requestHeaders.set('x-user-email', String(payload.email || ''))
      requestHeaders.set('x-user-name', String(payload.name || ''))
      requestHeaders.set('x-user-role', String(payload.role || 'user'))
      requestHeaders.set('x-user-auth', 'true')

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    return NextResponse.next()
  }

  // ==========================================================
  // 8. SECURITY HEADERS (par défaut)
  // ==========================================================
  // En développement : aucun CSP n'est posé (Next.js gère son HMR).
  // En production : HSTS + CSP stricte (la CSP vient de `next.config.js`).

  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

// ============================================================
// MATCHER
// ============================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|torrent.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map|ttf|otf|woff|woff2)$).*)',
  ],
}