// scripts/fix-errors.ts
import { autoFixError } from '../lib/ai-fixer'
import fs from 'fs'
import path from 'path'

// Récupérer les arguments
const args = process.argv.slice(2)
const filePath = args[0]
const errorMessage = args.slice(1).join(' ')

if (!filePath || !errorMessage) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🧠 TorrentTwist AI Fixer                                  ║
╚═══════════════════════════════════════════════════════════════╝

📖 Utilisation:
  npm run fix <file-path> "<error-message>"

📝 Exemples:
  npm run fix app/api/auth/signup/route.ts "SQLITE_ERROR: table users has no column named createdAt"
  npm run fix lib/db.ts "SQLITE_ERROR: no such column: mainGoal"
  npm run fix server.js "SQLITE_ERROR: no such column: userId"

⚙️  Options:
  --no-cache    Désactiver le cache
  --model=<nom> Utiliser un modèle spécifique

📊 Modèles gratuits disponibles:
  - google/gemini-2.0-flash-lite-preview-02-05:free
  - google/gemini-2.0-flash-exp:free
  - microsoft/phi-3-mini-4k-instruct:free
  - meta-llama/llama-3.2-3b-instruct:free
  - mistralai/mistral-7b-instruct:free
  - qwen/qwen-2.5-7b-instruct:free
  - deepseek/deepseek-chat:free
  `)
  process.exit(1)
}

// Vérifier que le fichier existe
if (!fs.existsSync(filePath)) {
  console.error(`❌ Fichier non trouvé: ${filePath}`)
  console.log('💡 Essayez avec un chemin relatif ou absolu')
  process.exit(1)
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🧠 TorrentTwist AI Fixer                                  ║
╠═══════════════════════════════════════════════════════════════╣
║   📁 Fichier: ${filePath.padEnd(40)}║
║   🔍 Erreur: ${errorMessage.substring(0, 40).padEnd(40)}║
╚═══════════════════════════════════════════════════════════════╝
`)

// Lancer la correction
autoFixError({
  file: filePath,
  error: errorMessage
}).then(() => {
  console.log('✅ Correction terminée')
}).catch((error) => {
  console.error('❌ Erreur:', error.message)
})