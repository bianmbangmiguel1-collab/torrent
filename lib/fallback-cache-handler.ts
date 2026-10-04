// lib/fallback-cache-handler.ts
import { Redis } from '@upstash/redis/cloudflare';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Types attendus par OpenNext
type CacheEntryType = 'cache' | 'fetch' | 'composable';

interface CacheEntry {
  value: unknown;
  lastModified: number;
}

export default async function createFallbackCacheHandler() {
  // Récupérer l'environnement Cloudflare au moment de l'appel
  const { env } = await getCloudflareContext({ async: true });

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL as string,
    token: env.UPSTASH_REDIS_REST_TOKEN as string,
  });

  const kv = env.NEXT_INC_CACHE_KV as KVNamespace;
  const prefix = 'torrentwist:cache:';
  const ONE_YEAR = 60 * 60 * 24 * 365;

  async function withFallback<T>(
    primary: () => Promise<T>,
    secondary: () => Promise<T>,
    operationName: string,
    fallbackValue: T
  ): Promise<T> {
    try {
      return await primary();
    } catch (primaryErr) {
      console.warn(
        `[Cache Fallback] ${operationName} a échoué sur Redis, basculement vers KV:`,
        primaryErr
      );
      try {
        return await secondary();
      } catch (secondaryErr) {
        console.error(
          `[Cache Fallback] ${operationName} a échoué sur KV également:`,
          secondaryErr
        );
        return fallbackValue;
      }
    }
  }

  return {
    name: 'fallback-cache-redis-kv',

    async get<CacheType extends CacheEntryType = 'cache'>(
      key: string,
      _cacheType?: CacheType
    ): Promise<CacheEntry | null> {
      return withFallback<CacheEntry | null>(
        async () => {
          const data = await redis.get<CacheEntry>(`${prefix}${key}`);
          return data ?? null;
        },
        async () => {
          const data = await kv.get<CacheEntry>(`${prefix}${key}`, 'json');
          return data ?? null;
        },
        'get',
        null
      );
    },

    async set<CacheType extends CacheEntryType = 'cache'>(
      key: string,
      value: CacheEntry,
      _cacheType?: CacheType
    ): Promise<void> {
      return withFallback<void>(
        async () => {
          await redis.set(`${prefix}${key}`, value, { ex: ONE_YEAR });
        },
        async () => {
          await kv.put(`${prefix}${key}`, JSON.stringify(value), {
            expirationTtl: ONE_YEAR,
          });
        },
        'set',
        undefined
      );
    },

    async delete(key: string): Promise<void> {
      return withFallback<void>(
        async () => {
          await redis.del(`${prefix}${key}`);
        },
        async () => {
          await kv.delete(`${prefix}${key}`);
        },
        'delete',
        undefined
      );
    },
  };
}