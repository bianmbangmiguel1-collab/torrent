// scripts/fix-all.js
const { fixAllErrors } = require('../lib/ai-fixer')

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🧠 TorrentTwist Fixer - Correction Complète              ║
╚═══════════════════════════════════════════════════════════════╝
`)

fixAllErrors()
  .then((result) => {
    if (result.success) {
      console.log('✅ Correction terminée avec succès !')
    } else {
      console.log('❌ Des erreurs sont survenues pendant la correction')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error.message)
    process.exit(1)
  })