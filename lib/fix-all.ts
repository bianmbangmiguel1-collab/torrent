// scripts/fix-all.ts
import { fixAllErrors } from '../lib/ai-fixer'

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🧠 TorrentTwist AI Fixer - Correction Complète           ║
║                                                             ║
║   🔧 Analyse tous les fichiers du projet                   ║
║   🔍 Détecte les erreurs de colonnes camelCase            ║
║   🧠 Corrige automatiquement avec OpenRouter              ║
║   💾 Crée des sauvegardes automatiques                    ║
╚═══════════════════════════════════════════════════════════════╝
`)

fixAllErrors()
  .then(result => {
    if (result.success) {
      console.log('✅ Correction terminée avec succès !')
    } else {
      console.log('❌ Des erreurs sont survenues pendant la correction')
    }
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error.message)
    process.exit(1)
  })