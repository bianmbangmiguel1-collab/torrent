// scripts/check.js
const { getAllProjectFiles, analyzeFile } = require('../lib/ai-fixer')
const path = require('path')

console.log('🔍 Vérification du projet...\n')

const files = getAllProjectFiles()
let totalErrors = 0
const errorFiles = []

for (const file of files) {
  const analysis = analyzeFile(file)
  if (analysis.errors.length > 0) {
    errorFiles.push(file)
    totalErrors += analysis.errors.length
    console.log(`❌ ${path.basename(file)}: ${analysis.errors.length} erreurs`)
  }
}

console.log(`\n📊 ${files.length} fichiers analysés`)
console.log(`📝 ${totalErrors} erreurs trouvées dans ${errorFiles.length} fichiers`)

if (totalErrors > 0) {
  console.log('\n💡 Lancez "npm run fix" pour corriger automatiquement')
} else {
  console.log('✅ Aucune erreur trouvée !')
}