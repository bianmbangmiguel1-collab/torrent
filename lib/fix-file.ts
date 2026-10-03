// scripts/fix-file.ts
import { quickFix } from '../lib/ai-fixer'

const args = process.argv.slice(2)
const filePath = args[0]
const errorMessage = args.slice(1).join(' ')

if (!filePath) {
  console.log(`
📖 Utilisation: npm run fix:file <fichier> "<erreur>"

Exemples:
  npm run fix:file app/api/auth/signup/route.ts "SQLITE_ERROR: table users has no column named createdAt"
  npm run fix:file lib/db.ts "SQLITE_ERROR: no such column: mainGoal"
  `)
  process.exit(1)
}

console.log(`\n🔧 Correction ciblée de ${filePath}\n`)

quickFix(filePath, errorMessage || 'Erreur de colonne camelCase')
  .then(result => {
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
  .catch(error => {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  })