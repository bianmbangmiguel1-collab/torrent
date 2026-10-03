// scripts/watch-errors.ts
import { ErrorMonitor, FREE_MODELS } from '../lib/ai-fixer'
import fs from 'fs'
import path from 'path'

const monitor = ErrorMonitor.getInstance()
monitor.enableAutoFix()

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   👀 TorrentTwist Error Monitor                             ║
╠═══════════════════════════════════════════════════════════════╣
║   📊 Modèles disponibles: ${FREE_MODELS.length}                            ║
║   🔄 Auto-fix: Activé                                       ║
╚═══════════════════════════════════════════════════════════════╝
`)

// Lire le fichier de log d'erreurs
const logFile = path.join(process.cwd(), 'error-log.json')

// Créer le fichier de log s'il n'existe pas
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify([], null, 2))
}

// Watcher les changements
fs.watch(logFile, (eventType, filename) => {
  if (eventType === 'change') {
    try {
      const content = fs.readFileSync(logFile, 'utf-8')
      const errors = JSON.parse(content)
      if (errors.length > 0) {
        const lastError = errors[errors.length - 1]
        monitor.logError(lastError)
      }
    } catch (e) {
      // Ignorer
    }
  }
})

// Watcher les fichiers .ts et .js
const watchDirs = ['app', 'lib', 'components', 'torrenttwist-backend']
const watchedFiles = new Set()

watchDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir)
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.tsx'))) {
        const filePath = path.join(fullPath, filename)
        if (!watchedFiles.has(filePath)) {
          watchedFiles.add(filePath)
          console.log(`👀 Watching: ${filePath}`)
          
          // Lire le contenu et vérifier les erreurs potentielles
          try {
            const content = fs.readFileSync(filePath, 'utf-8')
            // Vérifier les colonnes camelCase suspectes
            const camelCaseMatches = content.match(/\b(isAdmin|isVerified|createdAt|updatedAt|postalCode|mainGoal|experienceLevel|profileCompleteness|onboardingCompleted|onboardingStep|engagementScore|totalTimeSpent|lastActivity|isInternal|tempPassword|lockUntil|lastLogin|loginAttempts|orderNumber|downloadToken|paymentId|transactionId|trackingNumber)\b/g)
            if (camelCaseMatches && camelCaseMatches.length > 0) {
              console.log(`⚠️ Colonnes camelCase détectées dans ${filePath}:`, [...new Set(camelCaseMatches)])
            }
          } catch (e) {}
        }
      }
    })
  }
})

console.log('\n👀 Monitoring des fichiers... (Ctrl+C pour arrêter)\n')