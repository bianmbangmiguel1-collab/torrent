// lib/ai-fixer.ts
import fs from 'fs'
import path from 'path'

// ============================================================
// TYPES
// ============================================================

interface ColumnMapping {
  camelCase: string
  snakeCase: string
  type?: string
  default?: any
}

interface FileAnalysis {
  path: string
  content: string
  errors: string[]
  columns: ColumnMapping[]
  tables: string[]
  queries: string[]
}

interface FixResult {
  success: boolean
  files: {
    path: string
    original: string
    fixed: string
    changes: string[]
  }[]
  errors: string[]
  summary: string
}

// ============================================================
// MAPPING DES COLONNES (CamelCase → SnakeCase)
// ============================================================

const COLUMN_MAPPING: ColumnMapping[] = [
  // Utilisateur
  { camelCase: 'isAdmin', snakeCase: 'is_admin' },
  { camelCase: 'isVerified', snakeCase: 'is_verified' },
  { camelCase: 'isInternal', snakeCase: 'is_internal' },
  { camelCase: 'createdAt', snakeCase: 'created_at' },
  { camelCase: 'updatedAt', snakeCase: 'updated_at' },
  { camelCase: 'postalCode', snakeCase: 'postal_code' },
  { camelCase: 'loginAttempts', snakeCase: 'login_attempts' },
  { camelCase: 'lockUntil', snakeCase: 'lock_until' },
  { camelCase: 'lastLogin', snakeCase: 'last_login' },
  { camelCase: 'tempPassword', snakeCase: 'temp_password' },
  
  // Onboarding
  { camelCase: 'mainGoal', snakeCase: 'main_goal' },
  { camelCase: 'experienceLevel', snakeCase: 'experience_level' },
  { camelCase: 'profileCompleteness', snakeCase: 'profile_completeness' },
  { camelCase: 'onboardingCompleted', snakeCase: 'onboarding_completed' },
  { camelCase: 'onboardingStep', snakeCase: 'onboarding_step' },
  { camelCase: 'engagementScore', snakeCase: 'engagement_score' },
  { camelCase: 'totalTimeSpent', snakeCase: 'total_time_spent' },
  { camelCase: 'lastActivity', snakeCase: 'last_activity' },
  
  // Produits
  { camelCase: 'comparePrice', snakeCase: 'compare_price' },
  { camelCase: 'costPrice', snakeCase: 'cost_price' },
  { camelCase: 'stockAlert', snakeCase: 'stock_alert' },
  { camelCase: 'categoryId', snakeCase: 'category_id' },
  { camelCase: 'publishedAt', snakeCase: 'published_at' },
  { camelCase: 'scheduledAt', snakeCase: 'scheduled_at' },
  { camelCase: 'filePath', snakeCase: 'file_path' },
  { camelCase: 'fileSize', snakeCase: 'file_size' },
  { camelCase: 'fileFormat', snakeCase: 'file_format' },
  { camelCase: 'downloadLimit', snakeCase: 'download_limit' },
  { camelCase: 'downloadExpiresDays', snakeCase: 'download_expires_days' },
  { camelCase: 'validityStartDate', snakeCase: 'validity_start_date' },
  { camelCase: 'validityEndDate', snakeCase: 'validity_end_date' },
  { camelCase: 'validityDurationDays', snakeCase: 'validity_duration_days' },
  { camelCase: 'validityDurationUnit', snakeCase: 'validity_duration_unit' },
  { camelCase: 'hasAutoRenewal', snakeCase: 'has_auto_renewal' },
  { camelCase: 'renewalPrice', snakeCase: 'renewal_price' },
  { camelCase: 'baseCurrency', snakeCase: 'base_currency' },
  { camelCase: 'priceUsd', snakeCase: 'price_usd' },
  { camelCase: 'priceEur', snakeCase: 'price_eur' },
  { camelCase: 'priceGbp', snakeCase: 'price_gbp' },
  { camelCase: 'licenseValidityDays', snakeCase: 'license_validity_days' },
  { camelCase: 'licenseQuantity', snakeCase: 'license_quantity' },
  { camelCase: 'groupId', snakeCase: 'group_id' },
  { camelCase: 'groupLink', snakeCase: 'group_link' },
  { camelCase: 'requirePhone', snakeCase: 'require_phone' },
  { camelCase: 'courseId', snakeCase: 'course_id' },
  { camelCase: 'eventId', snakeCase: 'event_id' },
  { camelCase: 'eventDate', snakeCase: 'event_date' },
  { camelCase: 'eventLink', snakeCase: 'event_link' },
  { camelCase: 'creditsAmount', snakeCase: 'credits_amount' },
  { camelCase: 'subscriptionInterval', snakeCase: 'subscription_interval' },
  { camelCase: 'subscriptionTrialDays', snakeCase: 'subscription_trial_days' },
  { camelCase: 'consultationDuration', snakeCase: 'consultation_duration' },
  { camelCase: 'affiliateCommission', snakeCase: 'affiliate_commission' },
  { camelCase: 'metaTitle', snakeCase: 'meta_title' },
  { camelCase: 'metaDescription', snakeCase: 'meta_description' },
  { camelCase: 'metaKeywords', snakeCase: 'meta_keywords' },
  { camelCase: 'avgRating', snakeCase: 'avg_rating' },
  { camelCase: 'totalReviews', snakeCase: 'total_reviews' },
  { camelCase: 'createdBy', snakeCase: 'created_by' },
  { camelCase: 'updatedBy', snakeCase: 'updated_by' },
  
  // Commandes
  { camelCase: 'orderNumber', snakeCase: 'order_number' },
  { camelCase: 'orderId', snakeCase: 'order_id' },
  { camelCase: 'paymentStatus', snakeCase: 'payment_status' },
  { camelCase: 'paymentMethod', snakeCase: 'payment_method' },
  { camelCase: 'paymentId', snakeCase: 'payment_id' },
  { camelCase: 'transactionId', snakeCase: 'transaction_id' },
  { camelCase: 'shippingAddress', snakeCase: 'shipping_address' },
  { camelCase: 'shippingCity', snakeCase: 'shipping_city' },
  { camelCase: 'shippingCountry', snakeCase: 'shipping_country' },
  { camelCase: 'shippingPostal', snakeCase: 'shipping_postal' },
  { camelCase: 'trackingNumber', snakeCase: 'tracking_number' },
  { camelCase: 'downloadToken', snakeCase: 'download_token' },
  { camelCase: 'downloadExpiresAt', snakeCase: 'download_expires_at' },
  { camelCase: 'downloadCount', snakeCase: 'download_count' },
  
  // Autres
  { camelCase: 'userId', snakeCase: 'user_id' },
  { camelCase: 'productId', snakeCase: 'product_id' },
  { camelCase: 'productIds', snakeCase: 'product_ids' },
  { camelCase: 'categoryIds', snakeCase: 'category_ids' },
  { camelCase: 'isActive', snakeCase: 'is_active' },
  { camelCase: 'isMain', snakeCase: 'is_main' },
  { camelCase: 'isVisible', snakeCase: 'is_visible' },
  { camelCase: 'isFeatured', snakeCase: 'is_featured' },
  { camelCase: 'isVerifiedPurchase', snakeCase: 'is_verified_purchase' },
  { camelCase: 'helpfulCount', snakeCase: 'helpful_count' },
  { camelCase: 'notHelpfulCount', snakeCase: 'not_helpful_count' },
  { camelCase: 'adminReply', snakeCase: 'admin_reply' },
  { camelCase: 'spamScore', snakeCase: 'spam_score' },
  { camelCase: 'displayPriority', snakeCase: 'display_priority' },
  { camelCase: 'scheduledStart', snakeCase: 'scheduled_start' },
  { camelCase: 'scheduledEnd', snakeCase: 'scheduled_end' },
  { camelCase: 'displayCount', snakeCase: 'display_count' },
  { camelCase: 'clickCount', snakeCase: 'click_count' },
  { camelCase: 'conversionCount', snakeCase: 'conversion_count' },
  { camelCase: 'ipAddress', snakeCase: 'ip_address' },
  { camelCase: 'userAgent', snakeCase: 'user_agent' },
  { camelCase: 'sessionId', snakeCase: 'session_id' },
  { camelCase: 'parentId', snakeCase: 'parent_id' },
  { camelCase: 'viewedAt', snakeCase: 'viewed_at' },
  { camelCase: 'actionType', snakeCase: 'action_type' },
  { camelCase: 'searchQuery', snakeCase: 'search_query' },
  { camelCase: 'timeSpent', snakeCase: 'time_spent' },
  { camelCase: 'addedAt', snakeCase: 'added_at' },
  { camelCase: 'purchaseDate', snakeCase: 'purchase_date' },
  { camelCase: 'totalAmount', snakeCase: 'total_amount' },
  { camelCase: 'customerInfo', snakeCase: 'customer_info' },
  { camelCase: 'paymentReference', snakeCase: 'payment_reference' },
  { camelCase: 'checkoutId', snakeCase: 'checkout_id' },
  { camelCase: 'eventType', snakeCase: 'event_type' },
  { camelCase: 'fileType', snakeCase: 'file_type' },
  { camelCase: 'mimeType', snakeCase: 'mime_type' },
  { camelCase: 'uploadedBy', snakeCase: 'uploaded_by' },
  { camelCase: 'campaignId', snakeCase: 'campaign_id' },
  { camelCase: 'addToCart', snakeCase: 'add_to_cart' },
  { camelCase: 'seoAlt', snakeCase: 'seo_alt' },
  { camelCase: 'seoTitle', snakeCase: 'seo_title' },
  { camelCase: 'contrastCheck', snakeCase: 'contrast_check' },
  { camelCase: 'startDate', snakeCase: 'start_date' },
  { camelCase: 'endDate', snakeCase: 'end_date' },
  { camelCase: 'targetAudience', snakeCase: 'target_audience' },
  { camelCase: 'mediaType', snakeCase: 'media_type' },
  { camelCase: 'mediaUrl', snakeCase: 'media_url' },
  { camelCase: 'videoUrl', snakeCase: 'video_url' },
  { camelCase: 'linkUrl', snakeCase: 'link_url' },
  { camelCase: 'ctaText', snakeCase: 'cta_text' },
  { camelCase: 'ctaAction', snakeCase: 'cta_action' },
  { camelCase: 'ctaValue', snakeCase: 'cta_value' },
  { camelCase: 'mediaDesktop', snakeCase: 'media_desktop' },
  { camelCase: 'mediaTablet', snakeCase: 'media_tablet' },
  { camelCase: 'mediaMobile', snakeCase: 'media_mobile' },
  { camelCase: 'videoSource', snakeCase: 'video_source' },
  { camelCase: 'videoAutoplay', snakeCase: 'video_autoplay' },
  { camelCase: 'videoMuted', snakeCase: 'video_muted' },
  { camelCase: 'videoLoop', snakeCase: 'video_loop' },
  { camelCase: 'videoControls', snakeCase: 'video_controls' },
  { camelCase: 'videoMaxDuration', snakeCase: 'video_max_duration' },
  { camelCase: 'videoFallbackImage', snakeCase: 'video_fallback_image' },
  { camelCase: 'audioUrl', snakeCase: 'audio_url' },
  { camelCase: 'audioAutoplay', snakeCase: 'audio_autoplay' },
  { camelCase: 'audioControls', snakeCase: 'audio_controls' },
  { camelCase: 'contentPosition', snakeCase: 'content_position' },
  { camelCase: 'contentAlignment', snakeCase: 'content_alignment' },
  { camelCase: 'overlayOpacity', snakeCase: 'overlay_opacity' },
  { camelCase: 'textColor', snakeCase: 'text_color' },
  { camelCase: 'buttonColor', snakeCase: 'button_color' },
  { camelCase: 'backgroundColor', snakeCase: 'background_color' },
  { camelCase: 'animationEntrance', snakeCase: 'animation_entrance' },
  { camelCase: 'animationText', snakeCase: 'animation_text' },
  { camelCase: 'animationTransition', snakeCase: 'animation_transition' },
  { camelCase: 'autoplayInterval', snakeCase: 'autoplay_interval' },
  { camelCase: 'autoplayPauseOnHover', snakeCase: 'autoplay_pause_on_hover' },
  { camelCase: 'promotionId', snakeCase: 'promotion_id' },
  { camelCase: 'collectionId', snakeCase: 'collection_id' },
  { camelCase: 'siteName', snakeCase: 'site_name' },
  { camelCase: 'siteLogo', snakeCase: 'site_logo' },
  { camelCase: 'currencySymbol', snakeCase: 'currency_symbol' },
  { camelCase: 'taxRate', snakeCase: 'tax_rate' },
  { camelCase: 'maintenanceMode', snakeCase: 'maintenance_mode' },
  { camelCase: 'aiEnabled', snakeCase: 'ai_enabled' },
  { camelCase: 'aiProviders', snakeCase: 'ai_providers' },
  { camelCase: 'downloadExpiryDays', snakeCase: 'download_expiry_days' },
  { camelCase: 'maxDownloads', snakeCase: 'max_downloads' },
  { camelCase: 'downloadsCount', snakeCase: 'downloads_count' },
  { camelCase: 'accessStatus', snakeCase: 'access_status' },
  { camelCase: 'expiresAt', snakeCase: 'expires_at' },
  { camelCase: 'activatedAt', snakeCase: 'activated_at' },
  { camelCase: 'invitedAt', snakeCase: 'invited_at' },
  { camelCase: 'joinedAt', snakeCase: 'joined_at' },
  { camelCase: 'rateToDefault', snakeCase: 'rate_to_default' },
  { camelCase: 'isDefault', snakeCase: 'is_default' },
  { camelCase: 'currencyId', snakeCase: 'currency_id' },
  { camelCase: 'phoneCode', snakeCase: 'phone_code' },
  { camelCase: 'currencyCode', snakeCase: 'currency_code' },
  { camelCase: 'amountConverted', snakeCase: 'amount_converted' },
  { camelCase: 'paymentIntentId', snakeCase: 'payment_intent_id' },
  { camelCase: 'processed', snakeCase: 'processed' },
]

// ============================================================
// ANALYSE DE TOUS LES FICHIERS
// ============================================================

export function getAllProjectFiles(): string[] {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']
  const excludeDirs = ['node_modules', '.next', 'dist', 'build', '.git', 'coverage']
  const allFiles: string[] = []

  function walkDir(dir: string) {
    try {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            walkDir(fullPath)
          }
        } else if (extensions.includes(path.extname(item))) {
          allFiles.push(fullPath)
        }
      }
    } catch (e) {
      // Ignorer les erreurs d'accès
    }
  }

  walkDir(process.cwd())
  return allFiles
}

// ============================================================
// ANALYSE DES ERREURS DANS UN FICHIER
// ============================================================

export function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8')
  const errors: string[] = []
  const columns: ColumnMapping[] = []
  const tables: string[] = []
  const queries: string[] = []

  // Détecter les colonnes camelCase
  for (const mapping of COLUMN_MAPPING) {
    if (content.includes(mapping.camelCase) && !content.includes(mapping.snakeCase)) {
      errors.push(`Colonne camelCase trouvée: ${mapping.camelCase} → ${mapping.snakeCase}`)
      columns.push(mapping)
    }
  }

  return {
    path: filePath,
    content,
    errors,
    columns,
    tables,
    queries
  }
}

// ============================================================
// CORRECTION MANUELLE
// ============================================================

function manualFix(files: FileAnalysis[]): FixResult {
  const fixedFiles = []

  for (const file of files) {
    let content = file.content
    const changes: string[] = []
    let modified = false

    // Remplacer chaque colonne camelCase par snake_case
    for (const mapping of COLUMN_MAPPING) {
      const camelRegex = new RegExp(`\\b${mapping.camelCase}\\b`, 'g')
      const matches = content.match(camelRegex)
      
      if (matches) {
        const count = matches.length
        content = content.replace(camelRegex, mapping.snakeCase)
        changes.push(`Remplacé ${mapping.camelCase} → ${mapping.snakeCase} (${count} occurrence${count > 1 ? 's' : ''})`)
        modified = true
      }
    }

    if (modified) {
      fixedFiles.push({
        path: file.path,
        original: file.content,
        fixed: content,
        changes
      })
    } else {
      fixedFiles.push({
        path: file.path,
        original: file.content,
        fixed: file.content,
        changes: ['✅ Aucune modification nécessaire']
      })
    }
  }

  return {
    success: true,
    files: fixedFiles,
    errors: [],
    summary: `Correction manuelle de ${fixedFiles.filter(f => f.changes.length > 0).length} fichiers`
  }
}

// ============================================================
// APPLICATION DES CORRECTIONS
// ============================================================

function applyFixes(result: FixResult): FixResult {
  const appliedFiles = []

  for (const file of result.files) {
    try {
      // Créer une sauvegarde
      const backupPath = `${file.path}.backup.${Date.now()}`
      fs.writeFileSync(backupPath, file.original, 'utf-8')
      
      // Appliquer la correction
      fs.writeFileSync(file.path, file.fixed, 'utf-8')
      
      appliedFiles.push({
        ...file,
        changes: [
          `📁 Sauvegarde: ${backupPath}`,
          ...file.changes
        ]
      })
    } catch (error: any) {
      appliedFiles.push({
        ...file,
        changes: [
          ...file.changes,
          `❌ Erreur application: ${error.message}`
        ]
      })
    }
  }

  return {
    ...result,
    files: appliedFiles
  }
}

// ============================================================
// FONCTION PRINCIPALE : CORRECTION COMPLÈTE
// ============================================================

export async function fixAllErrors(): Promise<FixResult> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🧠 TorrentTwist Fixer - Correction Complète              ║
╚═══════════════════════════════════════════════════════════════╝
`)

  // 1. Analyser tous les fichiers
  console.log('📁 Analyse de tous les fichiers du projet...')
  const allFiles = getAllProjectFiles()
  console.log(`   ✅ ${allFiles.length} fichiers trouvés`)

  const analyzedFiles: FileAnalysis[] = []
  let totalErrors = 0

  for (const file of allFiles) {
    const analysis = analyzeFile(file)
    if (analysis.errors.length > 0) {
      analyzedFiles.push(analysis)
      totalErrors += analysis.errors.length
      console.log(`   🔍 ${path.basename(file)}: ${analysis.errors.length} erreurs`)
    }
  }

  if (analyzedFiles.length === 0) {
    console.log('\n✅ Aucune erreur trouvée !')
    return {
      success: true,
      files: [],
      errors: [],
      summary: '✅ Aucune erreur trouvée - Tout est parfait !'
    }
  }

  console.log(`\n📊 Total: ${analyzedFiles.length} fichiers avec ${totalErrors} erreurs`)

  // 2. Générer les corrections
  console.log('\n🧠 Génération des corrections...')
  const result = manualFix(analyzedFiles)

  // 3. Appliquer les corrections
  console.log('\n💾 Application des corrections...')
  const finalResult = applyFixes(result)

  // 4. Afficher le résumé
  console.log('\n' + '='.repeat(60))
  console.log('📊 RÉSUMÉ DE LA CORRECTION')
  console.log('='.repeat(60))
  console.log(`📁 Fichiers corrigés: ${finalResult.files.filter(f => f.changes.length > 0).length}`)
  console.log(`📝 Erreurs corrigées: ${totalErrors}`)
  
  for (const file of finalResult.files) {
    if (file.changes.length > 0 && !file.changes[0].includes('Aucune modification')) {
      console.log(`\n📁 ${path.basename(file.path)}`)
      for (const change of file.changes) {
        console.log(`   ${change}`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ ${finalResult.summary}`)
  console.log('\n⚠️  Vérifiez les modifications avant de redémarrer.')
  console.log('⚠️  Des sauvegardes ont été créées avec extension .backup.*\n')

  return finalResult
}

// ============================================================
// CORRECTION RAPIDE
// ============================================================

export async function quickFix(filePath: string, error: string): Promise<FixResult> {
  const analysis = analyzeFile(filePath)
  analysis.errors = [error, ...analysis.errors]
  
  const result = manualFix([analysis])
  return applyFixes(result)
}

// ============================================================
// EXPORT
// ============================================================

export default {
  fixAllErrors,
  quickFix,
  analyzeFile,
  getAllProjectFiles,
  COLUMN_MAPPING
}