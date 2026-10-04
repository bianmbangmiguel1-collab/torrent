// lib/fallback-cache-handler.ts
import { Redis } from '@upstash/redis/cloudflare';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type {
  CacheEntryType,
  CacheValue,
  WithLastModified,
  IncrementalCache,
} from '@opennextjs/aws/types/overrides';

// Type custom pour les variables d'environnement non déclarées dans wrangler.jsonc
interface CustomEnv {
  NEXT_INC_CACHE_KV: KVNamespace;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

export default async function createFallbackCacheHandler(): Promise<IncrementalCache> {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as CustomEnv;

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const kv = env.NEXT_INC_CACHE_KV;
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
    ): Promise<WithLastModified<CacheValue<CacheType>> | null> {
      return withFallback<WithLastModified<CacheValue<CacheType>> | null>(
        async () => {
          const data = await redis.get<WithLastModified<CacheValue<CacheType>>>(
            `${prefix}${key}`
          );
          return data ?? null;
        },
        async () => {
          const data = await kv.get<WithLastModified<CacheValue<CacheType>>>(
            `${prefix}${key}`,
            'json'
          );
          return data ?? null;
        },
        'get',
        null
      );
    },

    async set<CacheType extends CacheEntryType = 'cache'>(
      key: string,
      value: WithLastModified<CacheValue<CacheType>>,
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