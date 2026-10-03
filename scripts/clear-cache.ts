// scripts/clear-cache.ts
import { ErrorMonitor } from '../lib/ai-fixer'

const monitor = ErrorMonitor.getInstance()
monitor.clearCache()
console.log('✅ Cache vidé')