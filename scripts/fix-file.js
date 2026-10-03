// scripts/fix-file.js
const { quickFix } = require('../lib/ai-fixer')

const args = process.argv.slice(2)
const filePath = args[0]
const errorMessage = args.slice(1).join(' ')

if (!filePath) {
  console.log(`
📖 Utilisation: node scripts/fix-file.js <fichier> "<erreur>"

Exemples:
  node scripts/fix-file.js app/api/auth/signup/route.ts "SQLITE_ERROR: table users has no column named createdAt"
  node scripts/fix-file.js lib/db.ts "SQLITE_ERROR: no such column: mainGoal"
  `)
  process.exit(1)
}

console.log(`\n🔧 Correction ciblée de ${filePath}\n`)

quickFix(filePath, errorMessage || 'Erreur de colonne camelCase')
  .then((result) => {
    if (result.success) {
      console.log('✅ Correction réussie !')
      for (const file of result.files) {
        console.log(`\n📁 ${file.path}`)
        for (const change of file.changes) {
          console.log(`   ${change}`)
        }
      }
    } else {
      console.log('❌ Échec de la correction')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  })