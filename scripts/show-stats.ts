// scripts/show-stats.ts
import { ErrorMonitor } from '../lib/ai-fixer'

const monitor = ErrorMonitor.getInstance()

console.log('\n📊 Statistiques des modèles:')
const stats = monitor.getModelStats()
Object.entries(stats).forEach(([model, data]: [string, any]) => {
  console.log(`   ${model}:`)
  console.log(`      ✅ Succès: ${data.success}`)
  console.log(`      ❌ Échecs: ${data.fail}`)
  console.log(`      📊 Taux: ${data.successRate}`)
  console.log(`      🕐 Dernière utilisation: ${data.lastUsed}`)
})

console.log('\n💾 Cache:')
const cacheStats = monitor.getCacheStats()
console.log(`   📦 Entrées: ${cacheStats.size}`)
console.log(`   🔑 Clés: ${cacheStats.keys.join(', ')}`)

console.log('\n📝 Erreurs récentes:')
const errors = monitor.getErrors()
errors.slice(-5).forEach((error, index) => {
  console.log(`   ${index + 1}. ${error.error.substring(0, 60)}...`)
})