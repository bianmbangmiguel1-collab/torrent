// scripts/list-models.ts
import { FREE_MODELS } from '../lib/ai-fixer'

console.log('\n📊 Modèles gratuits disponibles sur OpenRouter:\n')
FREE_MODELS.forEach((model, index) => {
  console.log(`   ${index + 1}. ${model}`)
})
console.log(`\nTotal: ${FREE_MODELS.length} modèles\n`)