// lib/security/rate-limit.ts
import { auditLog } from './audit-log';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked?: boolean;
  blockedAt?: number;
}

// ⭐ Stockage en mémoire (à remplacer par Redis en production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// ⭐ Configuration
const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const BLOCK_DURATION_MS = 300000; // 5 minutes

interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  blockDuration?: number;
  key?: (req: any) => string;
}

// ⭐ Générer une clé de rate limiting
function generateKey(identifier: string, route: string): string {
  return `${identifier}:${route}`;
}

// ⭐ Vérifier et limiter les requêtes
export async function checkRateLimit(
  identifier: string,
  route: string,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number; resetAt: number; blocked?: boolean }> {
  const {
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
    blockDuration = BLOCK_DURATION_MS,
  } = options;

  const key = generateKey(identifier, route);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // ⭐ Vérifier si l'IP est bloquée
  if (entry?.blocked) {
    if (entry.blockedAt && now - entry.blockedAt < blockDuration) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.blockedAt + blockDuration,
        blocked: true,
      };
    }
    // Le blocage a expiré
    rateLimitStore.delete(key);
  }

  // ⭐ Nouvel utilisateur ou fenêtre expirée
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  // ⭐ Vérifier si la limite est atteinte
  if (entry.count >= limit) {
    // ⭐ Bloquer l'IP si trop de requêtes
    if (entry.count >= limit * 2) {
      rateLimitStore.set(key, {
        ...entry,
        blocked: true,
        blockedAt: now,
      });
      
      await auditLog('RATE_LIMIT_EXCEEDED', {
        identifier,
        route,
        count: entry.count,
        limit,
      });
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // ⭐ Incrémenter le compteur
  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ⭐ Middleware de rate limiting pour Next.js
export async function rateLimitMiddleware(
  request: Request,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; response?: Response }> {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const url = new URL(request.url);
  const route = url.pathname;

  const result = await checkRateLimit(ip, route, options);

  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({
        error: 'Trop de requêtes',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        blocked: result.blocked || false,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
    return { allowed: false, response };
  }

  return { allowed: true };
}