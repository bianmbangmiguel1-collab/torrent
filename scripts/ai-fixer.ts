// lib/ai-fixer.ts
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ============================================================
// CONFIGURATION
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️ OPENROUTER_API_KEY non définie dans .env.local')
}

// Modèles gratuits OpenRouter
const FREE_MODELS = [
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'google/gemini-2.0-flash-exp:free',
  'microsoft/phi-3-mini-4k-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'deepseek/deepseek-chat:free',
  'google/gemini-flash-1.5:free'
]

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'TorrentTwist AI Fixer'
  }
})

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
  { camelCase: 'isAdmin', snakeCase: 'is_admin', type: 'INTEGER', default: 0 },
  { camelCase: 'isVerified', snakeCase: 'is_verified', type: 'INTEGER', default: 1 },
  { camelCase: 'isInternal', snakeCase: 'is_internal', type: 'INTEGER', default: 0 },
  { camelCase: 'createdAt', snakeCase: 'created_at', type: 'DATETIME' },
  { camelCase: 'updatedAt', snakeCase: 'updated_at', type: 'DATETIME' },
  { camelCase: 'postalCode', snakeCase: 'postal_code', type: 'TEXT' },
  { camelCase: 'loginAttempts', snakeCase: 'login_attempts', type: 'INTEGER', default: 0 },
  { camelCase: 'lockUntil', snakeCase: 'lock_until', type: 'DATETIME' },
  { camelCase: 'lastLogin', snakeCase: 'last_login', type: 'DATETIME' },
  { camelCase: 'tempPassword', snakeCase: 'temp_password', type: 'TEXT' },
  
  // Onboarding
  { camelCase: 'mainGoal', snakeCase: 'main_goal', type: 'TEXT' },
  { camelCase: 'experienceLevel', snakeCase: 'experience_level', type: 'TEXT' },
  { camelCase: 'profileCompleteness', snakeCase: 'profile_completeness', type: 'INTEGER', default: 0 },
  { camelCase: 'onboardingCompleted', snakeCase: 'onboarding_completed', type: 'INTEGER', default: 0 },
  { camelCase: 'onboardingStep', snakeCase: 'onboarding_step', type: 'INTEGER', default: 0 },
  { camelCase: 'engagementScore', snakeCase: 'engagement_score', type: 'INTEGER', default: 0 },
  { camelCase: 'totalTimeSpent', snakeCase: 'total_time_spent', type: 'INTEGER', default: 0 },
  { camelCase: 'lastActivity', snakeCase: 'last_activity', type: 'DATETIME' },
  
  // Produits
  { camelCase: 'comparePrice', snakeCase: 'compare_price', type: 'INTEGER' },
  { camelCase: 'costPrice', snakeCase: 'cost_price', type: 'INTEGER' },
  { camelCase: 'stockAlert', snakeCase: 'stock_alert', type: 'INTEGER', default: 5 },
  { camelCase: 'categoryId', snakeCase: 'category_id', type: 'INTEGER' },
  { camelCase: 'publishedAt', snakeCase: 'published_at', type: 'DATETIME' },
  { camelCase: 'scheduledAt', snakeCase: 'scheduled_at', type: 'DATETIME' },
  { camelCase: 'filePath', snakeCase: 'file_path', type: 'TEXT' },
  { camelCase: 'fileSize', snakeCase: 'file_size', type: 'TEXT' },
  { camelCase: 'fileFormat', snakeCase: 'file_format', type: 'TEXT' },
  { camelCase: 'downloadLimit', snakeCase: 'download_limit', type: 'INTEGER', default: 0 },
  { camelCase: 'downloadExpiresDays', snakeCase: 'download_expires_days', type: 'INTEGER', default: 30 },
  { camelCase: 'validityStartDate', snakeCase: 'validity_start_date', type: 'DATETIME' },
  { camelCase: 'validityEndDate', snakeCase: 'validity_end_date', type: 'DATETIME' },
  { camelCase: 'validityDurationDays', snakeCase: 'validity_duration_days', type: 'INTEGER', default: 0 },
  { camelCase: 'validityDurationUnit', snakeCase: 'validity_duration_unit', type: 'TEXT', default: 'days' },
  { camelCase: 'hasAutoRenewal', snakeCase: 'has_auto_renewal', type: 'INTEGER', default: 0 },
  { camelCase: 'renewalPrice', snakeCase: 'renewal_price', type: 'INTEGER' },
  { camelCase: 'baseCurrency', snakeCase: 'base_currency', type: 'TEXT', default: 'FCFA' },
  { camelCase: 'priceUsd', snakeCase: 'price_usd', type: 'REAL' },
  { camelCase: 'priceEur', snakeCase: 'price_eur', type: 'REAL' },
  { camelCase: 'priceGbp', snakeCase: 'price_gbp', type: 'REAL' },
  { camelCase: 'licenseValidityDays', snakeCase: 'license_validity_days', type: 'INTEGER', default: 365 },
  { camelCase: 'licenseQuantity', snakeCase: 'license_quantity', type: 'INTEGER', default: 1 },
  { camelCase: 'groupId', snakeCase: 'group_id', type: 'TEXT' },
  { camelCase: 'groupLink', snakeCase: 'group_link', type: 'TEXT' },
  { camelCase: 'requirePhone', snakeCase: 'require_phone', type: 'INTEGER', default: 0 },
  { camelCase: 'courseId', snakeCase: 'course_id', type: 'INTEGER' },
  { camelCase: 'eventId', snakeCase: 'event_id', type: 'INTEGER' },
  { camelCase: 'eventDate', snakeCase: 'event_date', type: 'DATETIME' },
  { camelCase: 'eventLink', snakeCase: 'event_link', type: 'TEXT' },
  { camelCase: 'creditsAmount', snakeCase: 'credits_amount', type: 'INTEGER', default: 0 },
  { camelCase: 'subscriptionInterval', snakeCase: 'subscription_interval', type: 'TEXT' },
  { camelCase: 'subscriptionTrialDays', snakeCase: 'subscription_trial_days', type: 'INTEGER', default: 0 },
  { camelCase: 'consultationDuration', snakeCase: 'consultation_duration', type: 'INTEGER', default: 30 },
  { camelCase: 'affiliateCommission', snakeCase: 'affiliate_commission', type: 'REAL', default: 10 },
  { camelCase: 'metaTitle', snakeCase: 'meta_title', type: 'TEXT' },
  { camelCase: 'metaDescription', snakeCase: 'meta_description', type: 'TEXT' },
  { camelCase: 'metaKeywords', snakeCase: 'meta_keywords', type: 'TEXT' },
  { camelCase: 'avgRating', snakeCase: 'avg_rating', type: 'REAL', default: 0 },
  { camelCase: 'totalReviews', snakeCase: 'total_reviews', type: 'INTEGER', default: 0 },
  { camelCase: 'createdBy', snakeCase: 'created_by', type: 'INTEGER' },
  { camelCase: 'updatedBy', snakeCase: 'updated_by', type: 'INTEGER' },
  
  // Commandes
  { camelCase: 'orderNumber', snakeCase: 'order_number', type: 'TEXT' },
  { camelCase: 'orderId', snakeCase: 'order_id', type: 'INTEGER' },
  { camelCase: 'paymentStatus', snakeCase: 'payment_status', type: 'TEXT', default: 'pending' },
  { camelCase: 'paymentMethod', snakeCase: 'payment_method', type: 'TEXT' },
  { camelCase: 'paymentId', snakeCase: 'payment_id', type: 'TEXT' },
  { camelCase: 'transactionId', snakeCase: 'transaction_id', type: 'TEXT' },
  { camelCase: 'shippingAddress', snakeCase: 'shipping_address', type: 'TEXT' },
  { camelCase: 'shippingCity', snakeCase: 'shipping_city', type: 'TEXT' },
  { camelCase: 'shippingCountry', snakeCase: 'shipping_country', type: 'TEXT' },
  { camelCase: 'shippingPostal', snakeCase: 'shipping_postal', type: 'TEXT' },
  { camelCase: 'trackingNumber', snakeCase: 'tracking_number', type: 'TEXT' },
  { camelCase: 'downloadToken', snakeCase: 'download_token', type: 'TEXT' },
  { camelCase: 'downloadExpiresAt', snakeCase: 'download_expires_at', type: 'DATETIME' },
  { camelCase: 'downloadCount', snakeCase: 'download_count', type: 'INTEGER', default: 0 },
  
  // Autres
  { camelCase: 'userId', snakeCase: 'user_id', type: 'INTEGER' },
  { camelCase: 'productId', snakeCase: 'product_id', type: 'INTEGER' },
  { camelCase: 'productIds', snakeCase: 'product_ids', type: 'TEXT' },
  { camelCase: 'categoryIds', snakeCase: 'category_ids', type: 'TEXT' },
  { camelCase: 'isActive', snakeCase: 'is_active', type: 'INTEGER', default: 1 },
  { camelCase: 'isMain', snakeCase: 'is_main', type: 'INTEGER', default: 0 },
  { camelCase: 'isVisible', snakeCase: 'is_visible', type: 'INTEGER', default: 1 },
  { camelCase: 'isFeatured', snakeCase: 'is_featured', type: 'INTEGER', default: 0 },
  { camelCase: 'isVerifiedPurchase', snakeCase: 'is_verified_purchase', type: 'INTEGER', default: 0 },
  { camelCase: 'helpfulCount', snakeCase: 'helpful_count', type: 'INTEGER', default: 0 },
  { camelCase: 'notHelpfulCount', snakeCase: 'not_helpful_count', type: 'INTEGER', default: 0 },
  { camelCase: 'adminReply', snakeCase: 'admin_reply', type: 'TEXT' },
  { camelCase: 'spamScore', snakeCase: 'spam_score', type: 'REAL' },
  { camelCase: 'displayPriority', snakeCase: 'display_priority', type: 'INTEGER', default: 0 },
  { camelCase: 'scheduledStart', snakeCase: 'scheduled_start', type: 'DATETIME' },
  { camelCase: 'scheduledEnd', snakeCase: 'scheduled_end', type: 'DATETIME' },
  { camelCase: 'displayCount', snakeCase: 'display_count', type: 'INTEGER', default: 0 },
  { camelCase: 'clickCount', snakeCase: 'click_count', type: 'INTEGER', default: 0 },
  { camelCase: 'conversionCount', snakeCase: 'conversion_count', type: 'INTEGER', default: 0 },
  { camelCase: 'ipAddress', snakeCase: 'ip_address', type: 'TEXT' },
  { camelCase: 'userAgent', snakeCase: 'user_agent', type: 'TEXT' },
  { camelCase: 'sessionId', snakeCase: 'session_id', type: 'TEXT' },
  { camelCase: 'parentId', snakeCase: 'parent_id', type: 'INTEGER' },
  { camelCase: 'viewedAt', snakeCase: 'viewed_at', type: 'DATETIME' },
  { camelCase: 'actionType', snakeCase: 'action_type', type: 'TEXT' },
  { camelCase: 'searchQuery', snakeCase: 'search_query', type: 'TEXT' },
  { camelCase: 'timeSpent', snakeCase: 'time_spent', type: 'INTEGER', default: 0 },
  { camelCase: 'addedAt', snakeCase: 'added_at', type: 'DATETIME' },
  { camelCase: 'purchaseDate', snakeCase: 'purchase_date', type: 'DATETIME' },
  { camelCase: 'totalAmount', snakeCase: 'total_amount', type: 'REAL' },
  { camelCase: 'customerInfo', snakeCase: 'customer_info', type: 'TEXT' },
  { camelCase: 'paymentReference', snakeCase: 'payment_reference', type: 'TEXT' },
  { camelCase: 'checkoutId', snakeCase: 'checkout_id', type: 'TEXT' },
  { camelCase: 'eventType', snakeCase: 'event_type', type: 'TEXT' },
  { camelCase: 'fileType', snakeCase: 'file_type', type: 'TEXT' },
  { camelCase: 'mimeType', snakeCase: 'mime_type', type: 'TEXT' },
  { camelCase: 'uploadedBy', snakeCase: 'uploaded_by', type: 'INTEGER' },
  { camelCase: 'campaignId', snakeCase: 'campaign_id', type: 'INTEGER' },
  { camelCase: 'addToCart', snakeCase: 'add_to_cart', type: 'INTEGER', default: 0 },
  { camelCase: 'seoAlt', snakeCase: 'seo_alt', type: 'TEXT' },
  { camelCase: 'seoTitle', snakeCase: 'seo_title', type: 'TEXT' },
  { camelCase: 'contrastCheck', snakeCase: 'contrast_check', type: 'INTEGER', default: 1 },
  { camelCase: 'startDate', snakeCase: 'start_date', type: 'DATETIME' },
  { camelCase: 'endDate', snakeCase: 'end_date', type: 'DATETIME' },
  { camelCase: 'targetAudience', snakeCase: 'target_audience', type: 'TEXT', default: 'all' },
  { camelCase: 'mediaType', snakeCase: 'media_type', type: 'TEXT', default: 'image' },
  { camelCase: 'mediaUrl', snakeCase: 'media_url', type: 'TEXT' },
  { camelCase: 'videoUrl', snakeCase: 'video_url', type: 'TEXT' },
  { camelCase: 'linkUrl', snakeCase: 'link_url', type: 'TEXT' },
  { camelCase: 'ctaText', snakeCase: 'cta_text', type: 'TEXT' },
  { camelCase: 'ctaAction', snakeCase: 'cta_action', type: 'TEXT' },
  { camelCase: 'ctaValue', snakeCase: 'cta_value', type: 'TEXT' },
  { camelCase: 'mediaDesktop', snakeCase: 'media_desktop', type: 'TEXT' },
  { camelCase: 'mediaTablet', snakeCase: 'media_tablet', type: 'TEXT' },
  { camelCase: 'mediaMobile', snakeCase: 'media_mobile', type: 'TEXT' },
  { camelCase: 'videoSource', snakeCase: 'video_source', type: 'TEXT' },
  { camelCase: 'videoAutoplay', snakeCase: 'video_autoplay', type: 'INTEGER', default: 0 },
  { camelCase: 'videoMuted', snakeCase: 'video_muted', type: 'INTEGER', default: 1 },
  { camelCase: 'videoLoop', snakeCase: 'video_loop', type: 'INTEGER', default: 0 },
  { camelCase: 'videoControls', snakeCase: 'video_controls', type: 'INTEGER', default: 1 },
  { camelCase: 'videoMaxDuration', snakeCase: 'video_max_duration', type: 'INTEGER', default: 15 },
  { camelCase: 'videoFallbackImage', snakeCase: 'video_fallback_image', type: 'TEXT' },
  { camelCase: 'audioUrl', snakeCase: 'audio_url', type: 'TEXT' },
  { camelCase: 'audioAutoplay', snakeCase: 'audio_autoplay', type: 'INTEGER', default: 0 },
  { camelCase: 'audioControls', snakeCase: 'audio_controls', type: 'INTEGER', default: 1 },
  { camelCase: 'contentPosition', snakeCase: 'content_position', type: 'TEXT', default: 'center' },
  { camelCase: 'contentAlignment', snakeCase: 'content_alignment', type: 'TEXT', default: 'center' },
  { camelCase: 'overlayOpacity', snakeCase: 'overlay_opacity', type: 'INTEGER', default: 65 },
  { camelCase: 'textColor', snakeCase: 'text_color', type: 'TEXT', default: '#ffffff' },
  { camelCase: 'buttonColor', snakeCase: 'button_color', type: 'TEXT', default: '#2563eb' },
  { camelCase: 'backgroundColor', snakeCase: 'background_color', type: 'TEXT', default: 'rgba(0,0,0,0.5)' },
  { camelCase: 'animationEntrance', snakeCase: 'animation_entrance', type: 'TEXT', default: 'fade' },
  { camelCase: 'animationText', snakeCase: 'animation_text', type: 'TEXT', default: 'fade-up' },
  { camelCase: 'animationTransition', snakeCase: 'animation_transition', type: 'TEXT', default: 'fade' },
  { camelCase: 'autoplayInterval', snakeCase: 'autoplay_interval', type: 'INTEGER', default: 5 },
  { camelCase: 'autoplayPauseOnHover', snakeCase: 'autoplay_pause_on_hover', type: 'INTEGER', default: 1 },
  { camelCase: 'promotionId', snakeCase: 'promotion_id', type: 'INTEGER' },
  { camelCase: 'collectionId', snakeCase: 'collection_id', type: 'INTEGER' },
  { camelCase: 'siteName', snakeCase: 'site_name', type: 'TEXT', default: 'TorrentTwist' },
  { camelCase: 'siteLogo', snakeCase: 'site_logo', type: 'TEXT', default: '/torrent.png' },
  { camelCase: 'currencySymbol', snakeCase: 'currency_symbol', type: 'TEXT', default: 'CFA' },
  { camelCase: 'taxRate', snakeCase: 'tax_rate', type: 'REAL', default: 0 },
  { camelCase: 'maintenanceMode', snakeCase: 'maintenance_mode', type: 'INTEGER', default: 0 },
  { camelCase: 'aiEnabled', snakeCase: 'ai_enabled', type: 'INTEGER', default: 1 },
  { camelCase: 'aiProviders', snakeCase: 'ai_providers', type: 'TEXT' },
  { camelCase: 'downloadExpiryDays', snakeCase: 'download_expiry_days', type: 'INTEGER', default: 30 },
  { camelCase: 'maxDownloads', snakeCase: 'max_downloads', type: 'INTEGER', default: 1 },
  { camelCase: 'downloadsCount', snakeCase: 'downloads_count', type: 'INTEGER', default: 0 },
  { camelCase: 'accessStatus', snakeCase: 'access_status', type: 'TEXT', default: 'active' },
  { camelCase: 'expiresAt', snakeCase: 'expires_at', type: 'DATETIME' },
  { camelCase: 'activatedAt', snakeCase: 'activated_at', type: 'DATETIME' },
  { camelCase: 'invitedAt', snakeCase: 'invited_at', type: 'DATETIME' },
  { camelCase: 'joinedAt', snakeCase: 'joined_at', type: 'DATETIME' },
  { camelCase: 'rateToDefault', snakeCase: 'rate_to_default', type: 'REAL' },
  { camelCase: 'isDefault', snakeCase: 'is_default', type: 'INTEGER', default: 0 },
  { camelCase: 'currencyId', snakeCase: 'currency_id', type: 'INTEGER' },
  { camelCase: 'phoneCode', snakeCase: 'phone_code', type: 'TEXT' },
  { camelCase: 'currencyCode', snakeCase: 'currency_code', type: 'TEXT' },
  { camelCase: 'amountConverted', snakeCase: 'amount_converted', type: 'INTEGER' },
  { camelCase: 'paymentIntentId', snakeCase: 'payment_intent_id', type: 'TEXT' },
  { camelCase: 'processed', snakeCase: 'processed', type: 'INTEGER', default: 0 },
]

// ============================================================
// ANALYSE DE TOUS LES FICHIERS
// ============================================================

function getAllProjectFiles(): string[] {
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

function getDatabaseSchema(): string {
  try {
    const dbPath = path.join(process.cwd(), 'torrenttwist-backend', 'database.sqlite')
    if (fs.existsSync(dbPath)) {
      const output = execSync(`sqlite3 "${dbPath}" ".schema"`, { encoding: 'utf-8' })
      return output
    }
  } catch (e) {
    // Ignorer
  }
  return ''
}

// ============================================================
// ANALYSE DES ERREURS DANS UN FICHIER
// ============================================================

function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8')
  const errors: string[] = []
  const columns: ColumnMapping[] = []
  const tables: string[] = []
  const queries: string[] = []

  // Détecter les colonnes camelCase dans les requêtes SQL
  const sqlRegex = /`([^`]*)`|'([^']*)'|"([^"]*)"|\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|PRAGMA)\b/gi
  const matches = content.matchAll(sqlRegex)
  
  for (const match of matches) {
    const sql = match[0] || match[1] || match[2] || match[3]
    if (sql && sql.length > 10) {
      queries.push(sql)
      
      // Chercher les colonnes camelCase dans les requêtes SQL
      for (const mapping of COLUMN_MAPPING) {
        if (sql.includes(mapping.camelCase) && !sql.includes(mapping.snakeCase)) {
          errors.push(`Colonne camelCase trouvée: ${mapping.camelCase} → ${mapping.snakeCase}`)
          columns.push(mapping)
        }
      }
      
      // Chercher les noms de tables
      const tableMatch = sql.match(/FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)|TABLE\s+(\w+)/i)
      if (tableMatch) {
        const table = tableMatch[1] || tableMatch[2] || tableMatch[3] || tableMatch[4]
        if (table && !tables.includes(table)) {
          tables.push(table)
        }
      }
    }
  }

  // Détecter les colonnes camelCase dans les CREATE TABLE
  const createTableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([^)]*)\)/gi
  const createMatches = content.matchAll(createTableRegex)
  for (const match of createMatches) {
    const tableName = match[1]
    if (tableName) tables.push(tableName)
    
    const columnsDef = match[2] || ''
    for (const mapping of COLUMN_MAPPING) {
      if (columnsDef.includes(mapping.camelCase) && !columnsDef.includes(mapping.snakeCase)) {
        errors.push(`Colonne camelCase dans CREATE TABLE: ${mapping.camelCase} → ${mapping.snakeCase}`)
        columns.push(mapping)
      }
    }
  }

  // Détecter les colonnes camelCase dans les INSERT
  const insertRegex = /INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)/gi
  const insertMatches = content.matchAll(insertRegex)
  for (const match of insertMatches) {
    const columnsList = match[2] || ''
    for (const mapping of COLUMN_MAPPING) {
      if (columnsList.includes(mapping.camelCase) && !columnsList.includes(mapping.snakeCase)) {
        errors.push(`Colonne camelCase dans INSERT: ${mapping.camelCase} → ${mapping.snakeCase}`)
        if (!columns.find(c => c.camelCase === mapping.camelCase)) {
          columns.push(mapping)
        }
      }
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
// GÉNÉRATION DE LA CORRECTION PAR IA
// ============================================================

async function generateFixWithAI(
  files: FileAnalysis[],
  schema: string
): Promise<FixResult> {
  // Préparer le contexte
  const context = `
=== BASE DE DONNÉES ===
${schema || 'Aucune base de données trouvée'}

=== FICHIERS ANALYSÉS ===
${files.map(f => `
📁 ${f.path}
   Erreurs: ${f.errors.length}
   Colonnes à corriger: ${f.columns.map(c => `${c.camelCase} → ${c.snakeCase}`).join(', ')}
   Tables: ${f.tables.join(', ')}
`).join('\n')}

=== COLONNES À CORRIGER ===
${Array.from(new Set(files.flatMap(f => f.columns.map(c => c.camelCase)))).join(', ')}

=== ERREURS DÉTECTÉES ===
${Array.from(new Set(files.flatMap(f => f.errors))).join('\n')}
`

  const systemPrompt = `Tu es un expert en TypeScript/JavaScript et SQLite. Tu corriges TOUS les fichiers d'un projet.

RÈGLES IMPORTANTES :
1. Convertir TOUTES les colonnes camelCase en snake_case dans les requêtes SQL
2. Utiliser datetime('now') au lieu de new Date().toISOString()
3. Ajouter les colonnes manquantes dans les CREATE TABLE
4. Corriger les noms de colonnes dans les INSERT, UPDATE, SELECT
5. Ne modifier QUE ce qui est nécessaire
6. Retourner LE CODE COMPLET de chaque fichier corrigé

EXEMPLES DE CORRECTIONS :
- isVerified → is_verified
- isAdmin → is_admin
- createdAt → created_at
- updatedAt → updated_at
- postalCode → postal_code
- mainGoal → main_goal
- experienceLevel → experience_level
- profileCompleteness → profile_completeness
- onboardingCompleted → onboarding_completed
- onboardingStep → onboarding_step
- engagementScore → engagement_score
- totalTimeSpent → total_time_spent
- lastActivity → last_activity
- isInternal → is_internal
- tempPassword → temp_password
- lockUntil → lock_until
- lastLogin → last_login
- loginAttempts → login_attempts
- orderNumber → order_number
- downloadToken → download_token
- paymentId → payment_id
- transactionId → transaction_id
- trackingNumber → tracking_number
- userId → user_id
- productId → product_id

Pour chaque fichier, retourne :
1. Le chemin du fichier
2. Le code COMPLET corrigé
3. La liste des modifications effectuées`

  const userPrompt = `
${context}

Corrige TOUS les fichiers du projet. Retourne une réponse structurée JSON avec chaque fichier corrigé.`

  const model = FREE_MODELS[0] // Utiliser le premier modèle disponible

  try {
    console.log(`🧠 Appel à l'IA pour corriger ${files.length} fichiers...`)

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 8000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)

    return {
      success: true,
      files: result.files || [],
      errors: result.errors || [],
      summary: result.summary || 'Correction terminée'
    }

  } catch (error: any) {
    console.error('❌ Erreur IA:', error.message)
    
    // Fallback: correction manuelle basique
    return manualFix(files)
  }
}

// ============================================================
// CORRECTION MANUELLE DE FALLBACK
// ============================================================

function manualFix(files: FileAnalysis[]): FixResult {
  const fixedFiles = []
  const errors = []

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

    // Corriger les DEFAULT CURRENT_TIMESTAMP
    if (content.includes('DEFAULT CURRENT_TIMESTAMP')) {
      // Ne pas modifier, c'est déjà bon
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
    errors,
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
║   🧠 TorrentTwist AI Fixer - Correction Complète           ║
╚═══════════════════════════════════════════════════════════════╝
`)

  // 1. Récupérer la base de données
  console.log('📊 Récupération du schéma de la base de données...')
  const schema = getDatabaseSchema()
  
  if (schema) {
    console.log(`   ✅ Schéma trouvé (${schema.length} caractères)`)
  } else {
    console.log('   ⚠️ Aucun schéma trouvé')
  }

  // 2. Analyser tous les fichiers
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

  // 3. Générer les corrections
  console.log('\n🧠 Génération des corrections avec l\'IA...')
  const result = await generateFixWithAI(analyzedFiles, schema)

  if (!result.success) {
    console.log('\n⚠️ Échec de l\'IA, utilisation du fallback manuel...')
    const fallbackResult = manualFix(analyzedFiles)
    return applyFixes(fallbackResult)
  }

  // 4. Appliquer les corrections
  console.log('\n💾 Application des corrections...')
  const finalResult = applyFixes(result)

  // 5. Afficher le résumé
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
// COMMANDE DE CORRECTION RAPIDE
// ============================================================

export async function quickFix(filePath: string, error: string): Promise<FixResult> {
  const analysis = analyzeFile(filePath)
  analysis.errors = [error, ...analysis.errors]
  
  const result = await generateFixWithAI([analysis], '')
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