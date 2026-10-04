// open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import createFallbackCacheHandler from "./lib/fallback-cache-handler";

export default defineCloudflareConfig({
  incrementalCache: createFallbackCacheHandler,
});