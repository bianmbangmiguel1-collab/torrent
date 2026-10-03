// lib/db.sqlite-backup.ts
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'
import fs from 'fs'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const DB_PATH = path.join(process.cwd(), 'torrenttwist-backend', 'database.sqlite')
let dbInstance: Database | null = null
let dbInitializing: Promise<Database> | null = null

// ============================================================
// GET DB AVEC PROTECTION CONTRE LES INITIALISATIONS CONCURRENTES
// ============================================================

export async function getDB(): Promise<Database> {
  if (dbInstance) {
    return dbInstance
  }

  if (dbInitializing) {
    return dbInitializing
  }

  dbInitializing = (async () => {
    try {
      const dbDir = path.dirname(DB_PATH)

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      })

      await db.exec('PRAGMA foreign_keys = ON')
      await db.exec('PRAGMA journal_mode = WAL')
      await db.exec('PRAGMA synchronous = NORMAL')
      await db.exec('PRAGMA cache_size = 10000')

      console.log('✅ SQLite connecté (Next.js)')

      await migrateTables(db)

      dbInstance = db

      console.log('✅ Base SQLite initialisée')

      return db
    } catch (error) {
      console.error('❌ Erreur SQLite :', error)
      throw new Error('Impossible de se connecter à la base')
    } finally {
      dbInitializing = null
    }
  })()

  return dbInitializing
}

// ============================================================
// UTILITAIRE : AJOUTER UNE COLONNE SI ELLE N'EXISTE PAS (CORRIGÉ)
// ============================================================

async function addColumnIfNotExists(
  db: Database,
  table: string,
  column: string,
  type: string
) {
  try {
   // ✅ APRÈS — on récupère toutes les colonnes et on filtre côté JS
   const tableInfo = await db.all(`PRAGMA table_info("${table}")`)
   const columnExists = tableInfo.some((col: any) => col.name === column)
   if (columnExists) return

    // 🔥 CORRECTION : Conserver les DEFAULT pour les valeurs constantes
    let cleanType = type
      .replace(/\bUNIQUE\b/gi, '')
      .replace(/\bNOT NULL\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    // ⚠️ SQLite refuse les expressions non constantes dans ALTER TABLE
    // Exemple interdit : DATETIME DEFAULT CURRENT_TIMESTAMP
    // On ajoute donc simplement DATETIME sans DEFAULT
    if (/DEFAULT\s+CURRENT_TIMESTAMP/i.test(cleanType)) {
      cleanType = cleanType
        .replace(/\s+DEFAULT\s+CURRENT_TIMESTAMP\b/gi, '')
        .trim()
    }

    // Même précaution pour CURRENT_DATE / CURRENT_TIME
    if (/DEFAULT\s+(CURRENT_DATE|CURRENT_TIME)\b/i.test(cleanType)) {
      cleanType = cleanType
        .replace(/\s+DEFAULT\s+(CURRENT_DATE|CURRENT_TIME)\b/gi, '')
        .trim()
    }

    // Si le type est vide, utiliser TEXT par défaut
    if (!cleanType) {
      cleanType = 'TEXT'
    }

    // Construire la requête ALTER TABLE correcte
    const sql = `ALTER TABLE "${table}" ADD COLUMN "${column}" ${cleanType}`

    console.log(`   🔧 Migration: ${sql}`)

    await db.exec(sql)

    console.log(`   ✅ Colonne ${column} ajoutée à ${table}`)

  } catch (error: any) {
    // Si la colonne existe déjà (erreur duplicate), c'est bon
    if (error.message && error.message.includes('duplicate column name')) {
      return
    }
    console.warn(`   ⚠️ Impossible d'ajouter ${column} à ${table} :`, error.message)
  }
}

// ============================================================
// VÉRIFIER / CRÉER UNE TABLE ET AJOUTER SES COLONNES MANQUANTES
// ============================================================

async function ensureTable(
  db: Database,
  table: string,
  createSQL: string,
  columns: { name: string; type: string }[]
) {
  const exists = await db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [table]
  )

  if (!exists) {
    await db.exec(createSQL)
    console.log(`✅ Table ${table} créée`)
    return
  }

  for (const col of columns) {
    await addColumnIfNotExists(db, table, col.name, col.type)
  }
}

// ============================================================
// DÉFINITION DES TABLES (100% SNAKE_CASE)
// ============================================================

const tableDefinitions: Record<
  string,
  { createSQL: string; columns: { name: string; type: string }[] }
> = {
  // ---------- UTILISATEURS ----------
  users: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_admin INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 1,
        is_internal INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        phone TEXT,
        bio TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        avatar TEXT,
        preferences TEXT,
        login_attempts INTEGER DEFAULT 0,
        lock_until DATETIME,
        last_login DATETIME,
        main_goal TEXT,
        interests TEXT,
        experience_level TEXT,
        profile_completeness INTEGER DEFAULT 0,
        onboarding_completed INTEGER DEFAULT 0,
        onboarding_step INTEGER DEFAULT 0,
        engagement_score INTEGER DEFAULT 0,
        total_time_spent INTEGER DEFAULT 0,      
        timezone TEXT,
        language TEXT,
        currency TEXT,
        whatsapp_opt_in INTEGER DEFAULT 0,
        last_activity DATETIME,
        device_type TEXT,
        browser TEXT,
        os TEXT,
        role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
        token_version INTEGER DEFAULT 1,  
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_spent INTEGER DEFAULT 0,
        orders_count INTEGER DEFAULT 0,
        last_order_date DATETIME,
        vip_level TEXT DEFAULT 'standard',
        banned INTEGER DEFAULT 0,
        banned_reason TEXT,
        banned_at DATETIME,
        banned_by INTEGER,
        suspended INTEGER DEFAULT 0,
        suspended_until DATETIME,
        suspension_reason TEXT,
        suspended_by INTEGER,
        two_factor_enabled INTEGER DEFAULT 0,
        two_factor_secret TEXT,
        two_factor_backup_codes TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'email', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'password', type: 'TEXT NOT NULL' },
      { name: 'role', type: 'TEXT DEFAULT "user"' },
      { name: 'is_admin', type: 'INTEGER DEFAULT 0' },
      { name: 'is_verified', type: 'INTEGER DEFAULT 1' },
      { name: 'is_internal', type: 'INTEGER DEFAULT 0' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'phone', type: 'TEXT' },
      { name: 'bio', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'postal_code', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' },
      { name: 'preferences', type: 'TEXT' },
      { name: 'login_attempts', type: 'INTEGER DEFAULT 0' },
      { name: 'lock_until', type: 'DATETIME' },
      { name: 'last_login', type: 'DATETIME' },
      { name: 'main_goal', type: 'TEXT' },
      { name: 'interests', type: 'TEXT' },
      { name: 'experience_level', type: 'TEXT' },
      { name: 'profile_completeness', type: 'INTEGER DEFAULT 0' },
      { name: 'onboarding_completed', type: 'INTEGER DEFAULT 0' },
      { name: 'onboarding_step', type: 'INTEGER DEFAULT 0' },
      { name: 'engagement_score', type: 'INTEGER DEFAULT 0' },
      { name: 'total_time_spent', type: 'INTEGER DEFAULT 0' },
      { name: 'last_activity', type: 'DATETIME' },      
      { name: 'timezone', type: 'TEXT' },
      { name: 'language', type: 'TEXT' },
      { name: 'currency', type: 'TEXT' },
      { name: 'whatsapp_opt_in', type: 'INTEGER DEFAULT 0' },
      { name: 'device_type', type: 'TEXT' },
      { name: 'browser', type: 'TEXT' },
      { name: 'os', type: 'TEXT' },
      { name: 'role_id', type: 'INTEGER' },
      { name: 'token_version', type: 'INTEGER DEFAULT 1' }, 
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'total_spent', type: 'INTEGER DEFAULT 0' },
      { name: 'orders_count', type: 'INTEGER DEFAULT 0' },
      { name: 'last_order_date', type: 'DATETIME' },
      { name: 'vip_level', type: 'TEXT DEFAULT "standard"' },
      { name: 'banned', type: 'INTEGER DEFAULT 0' },
      { name: 'banned_reason', type: 'TEXT' },
      { name: 'banned_at', type: 'DATETIME' },
      { name: 'banned_by', type: 'INTEGER' },
      { name: 'suspended', type: 'INTEGER DEFAULT 0' },
      { name: 'suspended_until', type: 'DATETIME' },
      { name: 'suspension_reason', type: 'TEXT' },
      { name: 'suspended_by', type: 'INTEGER' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'email_notifications', type: 'INTEGER DEFAULT 1' },
      { name: 'push_notifications', type: 'INTEGER DEFAULT 1' },
      { name: 'whatsapp_notifications', type: 'INTEGER DEFAULT 0' },
      { name: 'total_favorites', type: 'INTEGER DEFAULT 0' },
      { name: 'total_reviews', type: 'INTEGER DEFAULT 0' },
      { name: 'two_factor_enabled', type: 'INTEGER DEFAULT 0' },
      { name: 'two_factor_secret', type: 'TEXT' },
      { name: 'two_factor_backup_codes', type: 'TEXT' },
      { name: 'referral_code', type: 'TEXT UNIQUE' },
      { name: 'referred_by', type: 'INTEGER' },
      { name: 'referral_rewards', type: 'INTEGER DEFAULT 0' },
    ],
  },
  user_rewards: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER DEFAULT 0,
        level TEXT DEFAULT 'standard',
        total_points_earned INTEGER DEFAULT 0,
        tier_benefits TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'points', type: 'INTEGER DEFAULT 0' },
      { name: 'level', type: 'TEXT DEFAULT "standard"' },
      { name: 'total_points_earned', type: 'INTEGER DEFAULT 0' },
      { name: 'tier_benefits', type: 'TEXT' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  // ---------- USER CART (pour la route /api/cart) ----------
  user_cart: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `,
  columns: [
    { name: 'user_id', type: 'INTEGER NOT NULL' },
    { name: 'product_id', type: 'INTEGER NOT NULL' },
    { name: 'quantity', type: 'INTEGER DEFAULT 1' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  user_reward_transactions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_reward_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        type TEXT NOT NULL,
        reference TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
  `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'points', type: 'INTEGER NOT NULL' },
      { name: 'type', type: 'TEXT NOT NULL' },
      { name: 'reference', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  roles: {
  createSQL: `
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL UNIQUE' },
      { name: 'slug', type: 'TEXT NOT NULL UNIQUE' },
      { name: 'description', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  newsletter_subscribers: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        phone TEXT,
        country TEXT,
        status TEXT DEFAULT 'active',
        source TEXT DEFAULT 'website',
        opt_in INTEGER DEFAULT 1,
        preferences TEXT,
        analysis TEXT,
        engagement_score INTEGER DEFAULT 0,
        interests TEXT,
        last_activity DATETIME,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at DATETIME,
        last_sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'email', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'name', type: 'TEXT' },
       { name: 'phone', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT "active"' },
      { name: 'source', type: 'TEXT DEFAULT "website"' },
      { name: 'opt_in', type: 'INTEGER DEFAULT 1' },
      { name: 'preferences', type: 'TEXT' },
      { name: 'analysis', type: 'TEXT' },
      { name: 'engagement_score', type: 'INTEGER DEFAULT 0' },
      { name: 'interests', type: 'TEXT' },
      { name: 'last_activity', type: 'DATETIME' },
      { name: 'subscribed_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'unsubscribed_at', type: 'DATETIME' },
      { name: 'last_sent_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  newsletter_templates: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS newsletter_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'both' CHECK(type IN ('admin', 'ai', 'both')),
        category TEXT DEFAULT 'general',
        variables TEXT,
        usage_count INTEGER DEFAULT 0,
        success_rate INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'subject', type: 'TEXT NOT NULL' },
      { name: 'content', type: 'TEXT NOT NULL' },
      { name: 'type', type: 'TEXT DEFAULT "both"' },
      { name: 'category', type: 'TEXT DEFAULT "general"' },
      { name: 'variables', type: 'TEXT' },
      { name: 'usage_count', type: 'INTEGER DEFAULT 0' },
      { name: 'success_rate', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      {name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

// ============================================================
// NEWSLETTER MESSAGES
// ============================================================

  newsletter_messages: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS newsletter_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscriber_id INTEGER NOT NULL,
        template_id INTEGER,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read', 'failed')),
        error TEXT,
        FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES newsletter_templates(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'subscriber_id', type: 'INTEGER NOT NULL' },
      { name: 'template_id', type: 'INTEGER' },
      { name: 'subject', type: 'TEXT NOT NULL' },
      { name: 'content', type: 'TEXT NOT NULL' },
      { name: 'sent_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'read_at', type: 'DATETIME' },
      { name: 'status', type: 'TEXT DEFAULT "sent"' },
      { name: 'error', type: 'TEXT' },
    ],
  },

// ============================================================
// NEWSLETTER READS
// ============================================================

  newsletter_reads: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS newsletter_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        subscriber_id INTEGER NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES newsletter_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
        UNIQUE(message_id, subscriber_id)
      )
    `,
    columns: [
      { name: 'message_id', type: 'INTEGER NOT NULL' },
      { name: 'subscriber_id', type: 'INTEGER NOT NULL' },
      { name: 'read_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

// ============================================================
// NEWSLETTER ACTIVITIES
// ============================================================

  newsletter_activities: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS newsletter_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('subscriber', 'campaign', 'template', 'analysis')),
        action TEXT NOT NULL,
        details TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'type', type: 'TEXT' },
      { name: 'action', type: 'TEXT NOT NULL' },
      { name: 'details', type: 'TEXT' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

// ============================================================
// NEWSLETTER CAMPAIGNS (version corrigée)
// ============================================================

  newsletter_campaigns: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS newsletter_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        template_id INTEGER,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'scheduled', 'failed')),
        sent_at DATETIME,
        scheduled_at DATETIME,
        recipients_count INTEGER DEFAULT 0,
        opens_count INTEGER DEFAULT 0,
        clicks_count INTEGER DEFAULT 0,
        unsubscribes_count INTEGER DEFAULT 0,
        segment TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES newsletter_templates(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'subject', type: 'TEXT NOT NULL' },
      { name: 'content', type: 'TEXT NOT NULL' },
      { name: 'template_id', type: 'INTEGER' },
      { name: 'status', type: 'TEXT DEFAULT "draft"' },
      { name: 'sent_at', type: 'DATETIME' },
      { name: 'scheduled_at', type: 'DATETIME' },
      { name: 'recipients_count', type: 'INTEGER DEFAULT 0' },
      { name: 'opens_count', type: 'INTEGER DEFAULT 0' },
      { name: 'clicks_count', type: 'INTEGER DEFAULT 0' },
      { name: 'unsubscribes_count', type: 'INTEGER DEFAULT 0' },
      { name: 'segment', type: 'TEXT' },
      { name: 'created_by', type: 'INTEGER' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

// ---------- NEWSLETTER STATS ----------
newsletter_stats: {
  createSQL: `
    CREATE TABLE IF NOT EXISTS newsletter_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      subscriber_id INTEGER NOT NULL,
      opened INTEGER DEFAULT 0,
      clicked INTEGER DEFAULT 0,
      unsubscribed INTEGER DEFAULT 0,  
      opened_at DATETIME,
      clicked_at DATETIME,
      unsubscribed_at DATETIME,        
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id) ON DELETE CASCADE
    )
  `,
  columns: [
    { name: 'campaign_id', type: 'INTEGER NOT NULL' },
    { name: 'subscriber_id', type: 'INTEGER NOT NULL' },
    { name: 'opened', type: 'INTEGER DEFAULT 0' },
    { name: 'clicked', type: 'INTEGER DEFAULT 0' },
    { name: 'unsubscribed', type: 'INTEGER DEFAULT 0' },  
    { name: 'opened_at', type: 'DATETIME' },
    { name: 'clicked_at', type: 'DATETIME' },
    { name: 'unsubscribed_at', type: 'DATETIME' },        
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
  ],
},


// ---------- PERMISSIONS ----------
  permissions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        module TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL UNIQUE' },
      { name: 'description', type: 'TEXT' },
      { name: 'module', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

// ---------- RÔLE_PERMISSIONS (liaison N:N) ----------
  role_permissions: {
  createSQL: `
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `,
    columns: [
      { name: 'role_id', type: 'INTEGER NOT NULL' },
      { name: 'permission_id', type: 'INTEGER NOT NULL' },
    ],
  },

  // ---------- CATÉGORIES ----------
  categories: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        description TEXT,
        image TEXT,
        position INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'slug', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'parent_id', type: 'INTEGER' },
      { name: 'description', type: 'TEXT' },
      { name: 'image', type: 'TEXT' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- COLLECTIONS ----------
  collections: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        product_ids TEXT,
        is_active INTEGER DEFAULT 1,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'slug', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'image', type: 'TEXT' },
      { name: 'product_ids', type: 'TEXT' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'created_by', type: 'INTEGER' },
    ],
  },

  // ---------- PROMOTIONS ----------
  promotions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'percentage',
        value REAL DEFAULT 0,
        code TEXT UNIQUE,
        start_date DATETIME,
        end_date DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'type', type: 'TEXT DEFAULT "percentage"' },
      { name: 'value', type: 'REAL DEFAULT 0' },
      { name: 'code', type: 'TEXT UNIQUE' },
      { name: 'start_date', type: 'DATETIME' },
      { name: 'end_date', type: 'DATETIME' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'created_by', type: 'INTEGER' },
    ],
  },

  // ---------- FLASH SALES ----------
  flash_sales: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS flash_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        discount_percent INTEGER DEFAULT 0,
        discount_amount INTEGER DEFAULT 0,
        product_ids TEXT,
        start_date DATETIME,
        end_date DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'discount_percent', type: 'INTEGER DEFAULT 0' },
      { name: 'discount_amount', type: 'INTEGER DEFAULT 0' },
      { name: 'product_ids', type: 'TEXT' },
      { name: 'start_date', type: 'DATETIME' },
      { name: 'end_date', type: 'DATETIME' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- COUPONS ----------
  coupons: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        discount_type TEXT DEFAULT 'percent',
        discount_value INTEGER NOT NULL,
        min_order_amount INTEGER DEFAULT 0,
        max_discount_amount INTEGER,
        usage_limit INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        user_limit INTEGER DEFAULT 1,
        product_ids TEXT,
        category_ids TEXT,
        start_date DATETIME,
        end_date DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'code', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'discount_type', type: 'TEXT DEFAULT "percent"' },
      { name: 'discount_value', type: 'INTEGER NOT NULL' },
      { name: 'min_order_amount', type: 'INTEGER DEFAULT 0' },
      { name: 'max_discount_amount', type: 'INTEGER' },
      { name: 'usage_limit', type: 'INTEGER DEFAULT 1' },
      { name: 'used_count', type: 'INTEGER DEFAULT 0' },
      { name: 'user_limit', type: 'INTEGER DEFAULT 1' },
      { name: 'product_ids', type: 'TEXT' },
      { name: 'category_ids', type: 'TEXT' },
      { name: 'start_date', type: 'DATETIME' },
      { name: 'end_date', type: 'DATETIME' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- HOMEPAGE SECTIONS ----------
  homepage_sections: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS homepage_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        settings TEXT,
        position INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        starts_at DATETIME,
        ends_at DATETIME,
        target_audience TEXT DEFAULT 'all',
        background TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'type', type: 'TEXT NOT NULL' },
      { name: 'title', type: 'TEXT' },
      { name: 'subtitle', type: 'TEXT' },
      { name: 'settings', type: 'TEXT' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'starts_at', type: 'DATETIME' },
      { name: 'ends_at', type: 'DATETIME' },
      { name: 'target_audience', type: 'TEXT DEFAULT "all"' },
      { name: 'background', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- SECTION STATS ----------
  section_stats: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS section_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER NOT NULL,
        section_type TEXT NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue INTEGER DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'section_id', type: 'INTEGER NOT NULL' },
      { name: 'section_type', type: 'TEXT NOT NULL' },
      { name: 'impressions', type: 'INTEGER DEFAULT 0' },
      { name: 'clicks', type: 'INTEGER DEFAULT 0' },
      { name: 'conversions', type: 'INTEGER DEFAULT 0' },
      { name: 'revenue', type: 'INTEGER DEFAULT 0' },
      { name: 'date', type: 'DATE DEFAULT CURRENT_DATE' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- AI RECOMMENDATIONS ----------
  ai_recommendations: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_ids TEXT NOT NULL,
        type TEXT DEFAULT 'personalized',
        score REAL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER' },
      { name: 'product_ids', type: 'TEXT NOT NULL' },
      { name: 'type', type: 'TEXT DEFAULT "personalized"' },
      { name: 'score', type: 'REAL' },
      { name: 'expires_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- PRODUITS ----------
products: {
  createSQL: `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      content TEXT,
      chariow_product_id TEXT,
      type TEXT DEFAULT 'file',
      price INTEGER NOT NULL,
      compare_price INTEGER,
      cost_price INTEGER,
      sku TEXT UNIQUE,
      barcode TEXT,
      stock INTEGER DEFAULT 0,
      stock_alert INTEGER DEFAULT 5,
      category_id INTEGER,
      brand TEXT,
      status TEXT DEFAULT 'draft',
      visibility TEXT DEFAULT 'public',
      password TEXT,
      published_at DATETIME,
      scheduled_at DATETIME,
      featured INTEGER DEFAULT 0,
      weight REAL,
      dimensions TEXT,
      file_path TEXT,
      file_size TEXT,
      file_name TEXT,
      file_format TEXT,
      download_limit INTEGER DEFAULT 0,
      download_expires_days INTEGER DEFAULT 30,
      validity_start_date DATETIME,
      validity_end_date DATETIME,
      validity_duration_days INTEGER DEFAULT 0,
      validity_duration_unit TEXT DEFAULT 'days',
      has_auto_renewal INTEGER DEFAULT 0,
      renewal_price INTEGER,
      base_currency TEXT DEFAULT 'FCFA',
      price_usd REAL,
      price_eur REAL,
      price_gbp REAL,
      license_validity_days INTEGER DEFAULT 365,
      license_quantity INTEGER DEFAULT 1,
      group_id TEXT,
      group_link TEXT,
      require_phone INTEGER DEFAULT 0,
      course_id INTEGER,
      event_id INTEGER,
      event_date DATETIME,
      event_link TEXT,
      credits_amount INTEGER DEFAULT 0,
      subscription_interval TEXT,
      subscription_trial_days INTEGER DEFAULT 0,
      consultation_duration INTEGER DEFAULT 30,
      affiliate_commission REAL DEFAULT 10,
      meta_title TEXT,
      meta_description TEXT,
      meta_keywords TEXT,
      avg_rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      updated_by INTEGER,
      author TEXT,
      chapters TEXT,
      download_url TEXT,
      content_preview TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `,
  columns: [
    { name: 'title', type: 'TEXT NOT NULL' },
    { name: 'slug', type: 'TEXT UNIQUE NOT NULL' },
    { name: 'description', type: 'TEXT' },
    { name: 'content', type: 'TEXT' },
    { name: 'chariow_product_id', type: 'TEXT' },
    { name: 'type', type: 'TEXT DEFAULT "file"' },
    { name: 'price', type: 'INTEGER NOT NULL' },
    { name: 'compare_price', type: 'INTEGER' },
    { name: 'cost_price', type: 'INTEGER' },
    { name: 'sku', type: 'TEXT UNIQUE' },
    { name: 'barcode', type: 'TEXT' },
    { name: 'stock', type: 'INTEGER DEFAULT 0' },
    { name: 'stock_alert', type: 'INTEGER DEFAULT 5' },
    { name: 'category_id', type: 'INTEGER' },
    { name: 'brand', type: 'TEXT' },
    { name: 'status', type: 'TEXT DEFAULT "draft"' },
    { name: 'visibility', type: 'TEXT DEFAULT "public"' },
    { name: 'password', type: 'TEXT' },
    { name: 'published_at', type: 'DATETIME' },
    { name: 'scheduled_at', type: 'DATETIME' },
    { name: 'featured', type: 'INTEGER DEFAULT 0' },
    { name: 'weight', type: 'REAL' },
    { name: 'dimensions', type: 'TEXT' },
    { name: 'file_path', type: 'TEXT' },
    { name: 'file_name', type: 'TEXT' },
    { name: 'file_size', type: 'TEXT' },
    { name: 'file_format', type: 'TEXT' },
    { name: 'download_limit', type: 'INTEGER DEFAULT 0' },
    { name: 'download_expires_days', type: 'INTEGER DEFAULT 30' },
    { name: 'validity_start_date', type: 'DATETIME' },
    { name: 'validity_end_date', type: 'DATETIME' },
    { name: 'validity_duration_days', type: 'INTEGER DEFAULT 0' },
    { name: 'validity_duration_unit', type: 'TEXT DEFAULT "days"' },
    { name: 'has_auto_renewal', type: 'INTEGER DEFAULT 0' },
    { name: 'renewal_price', type: 'INTEGER' },
    { name: 'base_currency', type: 'TEXT DEFAULT "FCFA"' },
    { name: 'price_usd', type: 'REAL' },
    { name: 'price_eur', type: 'REAL' },
    { name: 'price_gbp', type: 'REAL' },
    { name: 'license_validity_days', type: 'INTEGER DEFAULT 365' },
    { name: 'license_quantity', type: 'INTEGER DEFAULT 1' },
    { name: 'group_id', type: 'TEXT' },
    { name: 'group_link', type: 'TEXT' },
    { name: 'require_phone', type: 'INTEGER DEFAULT 0' },
    { name: 'course_id', type: 'INTEGER' },
    { name: 'event_id', type: 'INTEGER' },
    { name: 'event_date', type: 'DATETIME' },
    { name: 'event_link', type: 'TEXT' },
    { name: 'credits_amount', type: 'INTEGER DEFAULT 0' },
    { name: 'subscription_interval', type: 'TEXT' },
    { name: 'subscription_trial_days', type: 'INTEGER DEFAULT 0' },
    { name: 'consultation_duration', type: 'INTEGER DEFAULT 30' },
    { name: 'affiliate_commission', type: 'REAL DEFAULT 10' },
    { name: 'meta_title', type: 'TEXT' },
    { name: 'meta_description', type: 'TEXT' },
    { name: 'meta_keywords', type: 'TEXT' },
    { name: 'avg_rating', type: 'REAL DEFAULT 0' },
    { name: 'total_reviews', type: 'INTEGER DEFAULT 0' },
    { name: 'sales', type: 'INTEGER DEFAULT 0' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'content_preview', type: 'TEXT' },
    { name: 'chapters', type: 'TEXT' },
    { name: 'download_url', type: 'TEXT' },
    { name: 'created_by', type: 'INTEGER' },
    { name: 'updated_by', type: 'INTEGER' },
    { name: 'author', type: 'TEXT' },
  ],
},

  // ---------- IMAGES DES PRODUITS ----------
  product_images: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        alt TEXT,
        position INTEGER DEFAULT 0,
        is_main INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'url', type: 'TEXT NOT NULL' },
      { name: 'alt', type: 'TEXT' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'is_main', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  // ---------- REFERRAL TRANSACTIONS ----------
  referral_transactions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS referral_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER NOT NULL,
        referred_id INTEGER NOT NULL,
        amount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
  columns: [
    { name: 'referrer_id', type: 'INTEGER NOT NULL' },
    { name: 'referred_id', type: 'INTEGER NOT NULL' },
    { name: 'amount', type: 'INTEGER DEFAULT 0' },
    { name: 'status', type: 'TEXT DEFAULT "pending"' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
  ],
},
  // ---------- CART ITEMS ----------
  cart_items: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'quantity', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      
    ],
  },

  // ---------- GUEST CART ITEMS ----------
  guest_cart_items: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS guest_cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'session_id', type: 'TEXT NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'quantity', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- TAGS ----------
  tags: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'slug', type: 'TEXT UNIQUE NOT NULL' },
    ],
  },

  product_tags: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_tags (
        product_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (product_id, tag_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'tag_id', type: 'INTEGER NOT NULL' },
    ],
  },

  // ---------- ATTRIBUTS ----------
  attributes: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'slug', type: 'TEXT UNIQUE NOT NULL' },
    ],
  },

  attribute_values: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS attribute_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attribute_id INTEGER NOT NULL,
        value TEXT NOT NULL,
        slug TEXT NOT NULL,
        FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'attribute_id', type: 'INTEGER NOT NULL' },
      { name: 'value', type: 'TEXT NOT NULL' },
      { name: 'slug', type: 'TEXT NOT NULL' },
    ],
  },

  product_variants: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        attributes JSON,
        price INTEGER,
        stock INTEGER DEFAULT 0,
        sku TEXT UNIQUE,
        image TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'attributes', type: 'JSON' },
      { name: 'price', type: 'INTEGER' },
      { name: 'stock', type: 'INTEGER DEFAULT 0' },
      { name: 'sku', type: 'TEXT UNIQUE' },
      { name: 'image', type: 'TEXT' },
    ],
  },

  // ---------- COMMANDES (ORDERS) ----------
  orders: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        user_email TEXT,
        user_name TEXT,
        product_id INTEGER,
        product_title TEXT,
        products TEXT,
        subtotal REAL DEFAULT 0,
        total REAL NOT NULL,      
        amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'XOF',
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        payment_id TEXT,
        transaction_id TEXT,
        shipping_address TEXT,
        shipping_city TEXT,
        shipping_country TEXT,
        shipping_postal TEXT,
        tracking_number TEXT,
        download_token TEXT UNIQUE,
        paid_at DATETIME,
        download_expires_at DATETIME,
        download_count INTEGER DEFAULT 0,
        download_limit INTEGER DEFAULT 1,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'order_number', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'user_email', type: 'TEXT' },
      { name: 'user_name', type: 'TEXT' },  
      { name: 'product_title', type: 'TEXT' },
      { name: 'product_id', type: 'INTEGER' },  
      { name: 'products', type: 'TEXT' },
      { name: 'subtotal', type: 'REAL DEFAULT 0' },
      { name: 'total', type: 'REAL NOT NULL' },
      { name: 'amount', type: 'REAL NOT NULL' },
      { name: 'currency', type: 'TEXT DEFAULT "XOF"' },
      { name: 'status', type: 'TEXT DEFAULT "pending"' },
      { name: 'payment_status', type: 'TEXT DEFAULT "pending"' },
      { name: 'payment_method', type: 'TEXT' },
      { name: 'payment_id', type: 'TEXT' },
      { name: 'transaction_id', type: 'TEXT' },
      { name: 'shipping_address', type: 'TEXT' },
      { name: 'shipping_city', type: 'TEXT' },
      { name: 'shipping_country', type: 'TEXT' },
      { name: 'shipping_postal', type: 'TEXT' },
      { name: 'tracking_number', type: 'TEXT' },
      { name: 'download_token', type: 'TEXT UNIQUE' },
      { name: 'paid_at', type: 'DATETIME' },
      { name: 'download_expires_at', type: 'DATETIME' },
      { name: 'download_count', type: 'INTEGER DEFAULT 0' },
      { name: 'download_limit', type: 'INTEGER DEFAULT 1' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- ORDER ITEMS ----------
  order_items: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        variant_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price INTEGER NOT NULL,
        total INTEGER NOT NULL,
        product_title TEXT NOT NULL,
        product_file_path TEXT,
        product_file_size TEXT,
        product_format TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'order_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'variant_id', type: 'INTEGER' },
      { name: 'quantity', type: 'INTEGER DEFAULT 1' },
      { name: 'price', type: 'INTEGER NOT NULL' },
      { name: 'total', type: 'INTEGER NOT NULL' },
      { name: 'product_title', type: 'TEXT NOT NULL' },
      { name: 'product_file_path', type: 'TEXT' },
      { name: 'product_file_size', type: 'TEXT' },
      { name: 'product_format', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- REVIEWS ----------
  reviews: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        order_id INTEGER,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        status TEXT DEFAULT 'pending',
        is_verified_purchase INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        not_helpful_count INTEGER DEFAULT 0,
        admin_reply TEXT,
        sentiment TEXT,
        spam_score REAL,
        is_visible INTEGER DEFAULT 1,
        display_priority INTEGER DEFAULT 0,
        scheduled_start DATETIME,
        scheduled_end DATETIME,
        display_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        conversion_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        UNIQUE(user_id, product_id)
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'order_id', type: 'INTEGER' },
      { name: 'rating', type: 'INTEGER CHECK(rating >= 1 AND rating <= 5)' },
      { name: 'comment', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT "pending"' },
      { name: 'is_verified_purchase', type: 'INTEGER DEFAULT 0' },
      { name: 'is_featured', type: 'INTEGER DEFAULT 0' },
      { name: 'helpful_count', type: 'INTEGER DEFAULT 0' },
      { name: 'not_helpful_count', type: 'INTEGER DEFAULT 0' },
      { name: 'admin_reply', type: 'TEXT' },
      { name: 'sentiment', type: 'TEXT' },
      { name: 'spam_score', type: 'REAL' },
      { name: 'is_visible', type: 'INTEGER DEFAULT 1' },
      { name: 'display_priority', type: 'INTEGER DEFAULT 0' },
      { name: 'scheduled_start', type: 'DATETIME' },
      { name: 'scheduled_end', type: 'DATETIME' },
      { name: 'display_count', type: 'INTEGER DEFAULT 0' },
      { name: 'click_count', type: 'INTEGER DEFAULT 0' },
      { name: 'conversion_count', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- FAVORIS ----------
  user_favorites: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- VUES DES PRODUITS ----------
  user_product_views: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_product_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'viewed_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- ACTIVITÉS ----------
  activities: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details JSON,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER' },
      { name: 'action', type: 'TEXT NOT NULL' },
      { name: 'details', type: 'JSON' },
      { name: 'ip_address', type: 'TEXT' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- LOGS DE PAIEMENT ----------
  payment_logs: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS payment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_id INTEGER,
        amount INTEGER NOT NULL,
        method TEXT,
        status TEXT DEFAULT 'pending',
        reference TEXT,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'order_id', type: 'INTEGER' },
      { name: 'amount', type: 'INTEGER NOT NULL' },
      { name: 'method', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT "pending"' },
      { name: 'reference', type: 'TEXT' },
      { name: 'metadata', type: 'JSON' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- PARAMÈTRES ADMIN ----------
  admin_settings: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        site_name TEXT DEFAULT 'TorrentTwist',
        site_logo TEXT DEFAULT '/torrent.png',
        currency TEXT DEFAULT 'FCFA',
        currency_symbol TEXT DEFAULT 'CFA',
        tax_rate REAL DEFAULT 0,
        maintenance_mode INTEGER DEFAULT 0,
        ai_enabled INTEGER DEFAULT 1,
        ai_providers JSON,
        download_expiry_days INTEGER DEFAULT 30,
        download_limit INTEGER DEFAULT 5,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'site_name', type: 'TEXT DEFAULT "TorrentTwist"' },
      { name: 'site_logo', type: 'TEXT DEFAULT "/torrent.png"' },
      { name: 'currency', type: 'TEXT DEFAULT "FCFA"' },
      { name: 'currency_symbol', type: 'TEXT DEFAULT "CFA"' },
      { name: 'tax_rate', type: 'REAL DEFAULT 0' },
      { name: 'maintenance_mode', type: 'INTEGER DEFAULT 0' },
      { name: 'ai_enabled', type: 'INTEGER DEFAULT 1' },
      { name: 'ai_providers', type: 'JSON' },
      { name: 'download_expiry_days', type: 'INTEGER DEFAULT 30' },
      { name: 'download_limit', type: 'INTEGER DEFAULT 5' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- JETONS DE TÉLÉCHARGEMENT ----------
  download_tokens: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS download_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        max_downloads INTEGER DEFAULT 1,
        downloads_count INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'token', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'order_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'expires_at', type: 'DATETIME NOT NULL' },
      { name: 'max_downloads', type: 'INTEGER DEFAULT 1' },
      { name: 'downloads_count', type: 'INTEGER DEFAULT 0' },
      { name: 'ip_address', type: 'TEXT' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'used_at', type: 'DATETIME' },
    ],
  },

  // ---------- LIBRARY ----------
  library: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL,
        access_status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'order_id', type: 'INTEGER NOT NULL' },
      { name: 'access_status', type: 'TEXT DEFAULT "active"' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- PAYMENT EVENTS ----------
  payment_events: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS payment_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        checkout_id TEXT,
        transaction_id TEXT,
        event_type TEXT NOT NULL,
        amount REAL,
        currency TEXT,
        status TEXT,
        payload TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'order_id', type: 'INTEGER NOT NULL' },
      { name: 'checkout_id', type: 'TEXT' },
      { name: 'transaction_id', type: 'TEXT' },
      { name: 'event_type', type: 'TEXT NOT NULL' },
      { name: 'amount', type: 'REAL' },
      { name: 'currency', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'payload', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- LICENCES ----------
  licenses: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        expires_at DATETIME,
        activated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'code', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'status', type: 'TEXT DEFAULT "active"' },
      { name: 'expires_at', type: 'DATETIME' },
      { name: 'activated_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- GROUP ACCESS ----------
  group_access: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS group_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'pending',
        invited_at DATETIME,
        joined_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'phone', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT "pending"' },
      { name: 'invited_at', type: 'DATETIME' },
      { name: 'joined_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- USER CREDITS ----------
  user_credits: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        balance INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'balance', type: 'INTEGER DEFAULT 0' },
    ],
  },

  // ---------- CREDIT TRANSACTIONS ----------
  credit_transactions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        reference TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'amount', type: 'INTEGER NOT NULL' },
      { name: 'type', type: 'TEXT NOT NULL' },
      { name: 'reference', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- CURRENCIES ----------
  currencies: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS currencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        rate_to_default REAL NOT NULL,
        is_default INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'code', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'symbol', type: 'TEXT NOT NULL' },
      { name: 'rate_to_default', type: 'REAL NOT NULL' },
      { name: 'is_default', type: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  // ---------- NOTIFICATIONS ----------
  notifications: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT DEFAULT 'info',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        link TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'type', type: 'TEXT DEFAULT "info"' },
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'message', type: 'TEXT NOT NULL' },
      { name: 'is_read', type: 'INTEGER DEFAULT 0' },
      { name: 'link', type: 'TEXT' },
      { name: 'icon', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  // ---------- COUNTRIES ----------
  countries: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        currency_id INTEGER,
        phone_code TEXT,
        FOREIGN KEY (currency_id) REFERENCES currencies(id)
      )
    `,
    columns: [
      { name: 'code', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'currency_id', type: 'INTEGER' },
      { name: 'phone_code', type: 'TEXT' },
    ],
  },

  // ---------- PAYMENTS ----------
  payments: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        currency_code TEXT NOT NULL,
        amount_converted INTEGER NOT NULL,
        method TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        payment_intent_id TEXT,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'order_id', type: 'INTEGER NOT NULL' },
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'amount', type: 'INTEGER NOT NULL' },
      { name: 'currency_code', type: 'TEXT NOT NULL' },
      { name: 'amount_converted', type: 'INTEGER NOT NULL' },
      { name: 'method', type: 'TEXT NOT NULL' },
      { name: 'status', type: 'TEXT DEFAULT "pending"' },
      { name: 'transaction_id', type: 'TEXT' },
      { name: 'payment_intent_id', type: 'TEXT' },
      { name: 'metadata', type: 'JSON' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- WEBHOOKS ----------
  webhooks: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        payload JSON NOT NULL,
        processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'event_type', type: 'TEXT NOT NULL' },
      { name: 'payload', type: 'JSON NOT NULL' },
      { name: 'processed', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- BANNERS ----------
  banners: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        media_type TEXT DEFAULT 'image',
        media_url TEXT NOT NULL,
        video_url TEXT,
        link_url TEXT,
        position INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        starts_at DATETIME,
        ends_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'media_type', type: 'TEXT DEFAULT "image"' },
      { name: 'media_url', type: 'TEXT NOT NULL' },
      { name: 'video_url', type: 'TEXT' },
      { name: 'link_url', type: 'TEXT' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'starts_at', type: 'DATETIME' },
      { name: 'ends_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- SEASONAL MESSAGES ----------
  seasonal_messages: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS seasonal_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        icon TEXT,
        theme TEXT,
        is_active INTEGER DEFAULT 1,
        starts_at DATETIME,
        ends_at DATETIME,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'content', type: 'TEXT NOT NULL' },
      { name: 'icon', type: 'TEXT' },
      { name: 'theme', type: 'TEXT' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'starts_at', type: 'DATETIME' },
      { name: 'ends_at', type: 'DATETIME' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- ADVERTISEMENTS ----------
  advertisements: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS advertisements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        link_url TEXT,
        category_id INTEGER,
        position INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        starts_at DATETIME,
        ends_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'image_url', type: 'TEXT NOT NULL' },
      { name: 'link_url', type: 'TEXT' },
      { name: 'category_id', type: 'INTEGER' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'starts_at', type: 'DATETIME' },
      { name: 'ends_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- CAMPAIGNS ----------
  campaigns: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        type TEXT DEFAULT 'carousel',
        start_date DATETIME,
        end_date DATETIME,
        timezone TEXT DEFAULT 'Africa/Douala',
        target_audience TEXT DEFAULT 'all',
        devices TEXT DEFAULT '["desktop","tablet","mobile"]',
        countries TEXT,
        languages TEXT,
        seo_alt TEXT,
        seo_title TEXT,
        contrast_check INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'status', type: 'TEXT DEFAULT "draft"' },
      { name: 'type', type: 'TEXT DEFAULT "carousel"' },
      { name: 'start_date', type: 'DATETIME' },
      { name: 'end_date', type: 'DATETIME' },
      { name: 'timezone', type: 'TEXT DEFAULT "Africa/Douala"' },
      { name: 'target_audience', type: 'TEXT DEFAULT "all"' },
      { name: 'devices', type: 'TEXT' },
      { name: 'countries', type: 'TEXT' },
      { name: 'languages', type: 'TEXT' },
      { name: 'seo_alt', type: 'TEXT' },
      { name: 'seo_title', type: 'TEXT' },
      { name: 'contrast_check', type: 'INTEGER DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'created_by', type: 'INTEGER' },
    ],
  },

  // ---------- SLIDES ----------
  slides: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS slides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        position INTEGER DEFAULT 0,
        type TEXT DEFAULT 'image',
        title TEXT,
        subtitle TEXT,
        description TEXT,
        cta_text TEXT,
        cta_action TEXT,
        cta_value TEXT,
        media_type TEXT DEFAULT 'image',
        media_url TEXT,
        media_desktop TEXT,
        media_tablet TEXT,
        media_mobile TEXT,
        video_source TEXT,
        video_autoplay INTEGER DEFAULT 0,
        video_muted INTEGER DEFAULT 1,
        video_loop INTEGER DEFAULT 0,
        video_controls INTEGER DEFAULT 1,
        video_max_duration INTEGER DEFAULT 15,
        video_fallback_image TEXT,
        audio_url TEXT,
        audio_autoplay INTEGER DEFAULT 0,
        audio_controls INTEGER DEFAULT 1,
        content_position TEXT DEFAULT 'center',
        content_alignment TEXT DEFAULT 'center',
        overlay_opacity INTEGER DEFAULT 65,
        text_color TEXT DEFAULT '#ffffff',
        button_color TEXT DEFAULT '#2563eb',
        background_color TEXT DEFAULT 'rgba(0,0,0,0.5)',
        animation_entrance TEXT DEFAULT 'fade',
        animation_text TEXT DEFAULT 'fade-up',
        animation_transition TEXT DEFAULT 'fade',
        autoplay_interval INTEGER DEFAULT 5,
        autoplay_pause_on_hover INTEGER DEFAULT 1,
        promotion_id INTEGER,
        product_ids TEXT,
        collection_id INTEGER,
        category_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (promotion_id) REFERENCES promotions(id),
        FOREIGN KEY (collection_id) REFERENCES collections(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `,
    columns: [
      { name: 'campaign_id', type: 'INTEGER NOT NULL' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'type', type: 'TEXT DEFAULT "image"' },
      { name: 'title', type: 'TEXT' },
      { name: 'subtitle', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'cta_text', type: 'TEXT' },
      { name: 'cta_action', type: 'TEXT' },
      { name: 'cta_value', type: 'TEXT' },
      { name: 'media_type', type: 'TEXT DEFAULT "image"' },
      { name: 'media_url', type: 'TEXT' },
      { name: 'media_desktop', type: 'TEXT' },
      { name: 'media_tablet', type: 'TEXT' },
      { name: 'media_mobile', type: 'TEXT' },
      { name: 'video_source', type: 'TEXT' },
      { name: 'video_autoplay', type: 'INTEGER DEFAULT 0' },
      { name: 'video_muted', type: 'INTEGER DEFAULT 1' },
      { name: 'video_loop', type: 'INTEGER DEFAULT 0' },
      { name: 'video_controls', type: 'INTEGER DEFAULT 1' },
      { name: 'video_max_duration', type: 'INTEGER DEFAULT 15' },
      { name: 'video_fallback_image', type: 'TEXT' },
      { name: 'audio_url', type: 'TEXT' },
      { name: 'audio_autoplay', type: 'INTEGER DEFAULT 0' },
      { name: 'audio_controls', type: 'INTEGER DEFAULT 1' },
      { name: 'content_position', type: 'TEXT DEFAULT "center"' },
      { name: 'content_alignment', type: 'TEXT DEFAULT "center"' },
      { name: 'overlay_opacity', type: 'INTEGER DEFAULT 65' },
      { name: 'text_color', type: 'TEXT DEFAULT "#ffffff"' },
      { name: 'button_color', type: 'TEXT DEFAULT "#2563eb"' },
      { name: 'background_color', type: 'TEXT DEFAULT "rgba(0,0,0,0.5)"' },
      { name: 'animation_entrance', type: 'TEXT DEFAULT "fade"' },
      { name: 'animation_text', type: 'TEXT DEFAULT "fade-up"' },
      { name: 'animation_transition', type: 'TEXT DEFAULT "fade"' },
      { name: 'autoplay_interval', type: 'INTEGER DEFAULT 5' },
      { name: 'autoplay_pause_on_hover', type: 'INTEGER DEFAULT 1' },
      { name: 'promotion_id', type: 'INTEGER' },
      { name: 'product_ids', type: 'TEXT' },
      { name: 'collection_id', type: 'INTEGER' },
      { name: 'category_id', type: 'INTEGER' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  
   // ---------- ADMIN ACCOUNTS ----------
  admin_accounts: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        isActive INTEGER DEFAULT 1,
        isFirstLogin INTEGER DEFAULT 1,
        twoFactorEnabled INTEGER DEFAULT 0,
        twoFactorSecret TEXT,
        loginAttempts INTEGER DEFAULT 0,
        lockUntil DATETIME,
        lastLogin DATETIME,
        userId INTEGER UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'email', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'passwordHash', type: 'TEXT NOT NULL' },
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'role', type: 'TEXT DEFAULT "admin"' },
      { name: 'isActive', type: 'INTEGER DEFAULT 1' },
      { name: 'isFirstLogin', type: 'INTEGER DEFAULT 1' },
      { name: 'twoFactorEnabled', type: 'INTEGER DEFAULT 0' },
      { name: 'twoFactorSecret', type: 'TEXT' },
      { name: 'loginAttempts', type: 'INTEGER DEFAULT 0' },
      { name: 'lockUntil', type: 'DATETIME' },
      { name: 'lastLogin', type: 'DATETIME' },
      { name: 'userId', type: 'INTEGER UNIQUE' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  user_profile_logs: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_profile_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        field TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
      )
  `,
  columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'field', type: 'TEXT NOT NULL' },
      { name: 'old_value', type: 'TEXT' },
      { name: 'new_value', type: 'TEXT' },
      { name: 'changed_by', type: 'INTEGER' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  agent_conversations: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS agent_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        product_id INTEGER,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `,

    columns: [
      { name: 'user_email', type: 'TEXT' },
      { name: 'product_id', type: 'INTEGER' },
      { name: 'question', type: 'TEXT NOT NULL' },
      { name: 'answer', type: 'TEXT NOT NULL' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

// ---------- USER SESSIONS ----------
  user_sessions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        device_type TEXT,
        browser TEXT,
        os TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'token', type: 'TEXT NOT NULL' },
      { name: 'device_type', type: 'TEXT' },
      { name: 'browser', type: 'TEXT' },
      { name: 'os', type: 'TEXT' },
      { name: 'ip', type: 'TEXT' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'expires_at', type: 'DATETIME' },
      { name: 'last_activity', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
    ],
  },
  // ---------- MEDIA LIBRARY ----------
  media_library: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS media_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        mime_type TEXT,
        size INTEGER,
        dimensions TEXT,
        alt TEXT,
        uploaded_by INTEGER,
        campaign_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'name', type: 'TEXT NOT NULL' },
      { name: 'file_path', type: 'TEXT NOT NULL' },
      { name: 'file_type', type: 'TEXT' },
      { name: 'mime_type', type: 'TEXT' },
      { name: 'size', type: 'INTEGER' },
      { name: 'dimensions', type: 'TEXT' },
      { name: 'alt', type: 'TEXT' },
      { name: 'uploaded_by', type: 'INTEGER' },
      { name: 'campaign_id', type: 'INTEGER' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
   
 
  // ---------- CAMPAIGN STATS ----------
  campaign_stats: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS campaign_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        impressions INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        ctr REAL DEFAULT 0,
        add_to_cart INTEGER DEFAULT 0,
        purchases INTEGER DEFAULT 0,
        revenue INTEGER DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'campaign_id', type: 'INTEGER NOT NULL' },
      { name: 'impressions', type: 'INTEGER DEFAULT 0' },
      { name: 'views', type: 'INTEGER DEFAULT 0' },
      { name: 'clicks', type: 'INTEGER DEFAULT 0' },
      { name: 'ctr', type: 'REAL DEFAULT 0' },
      { name: 'add_to_cart', type: 'INTEGER DEFAULT 0' },
      { name: 'purchases', type: 'INTEGER DEFAULT 0' },
      { name: 'revenue', type: 'INTEGER DEFAULT 0' },
      { name: 'date', type: 'DATE DEFAULT CURRENT_DATE' },
    ],
  },
  
  // ============================================================
  // ⭐⭐⭐ NOUVEAU : Tables du parcours personnalisé ⭐⭐⭐
  // ============================================================

  // ---------- OBJECTIFS UTILISATEUR ----------
  goals: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        raw_text TEXT NOT NULL,
        clarified_text TEXT,
        category TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'raw_text', type: 'TEXT NOT NULL' },
      { name: 'clarified_text', type: 'TEXT' },
      { name: 'category', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT "active"' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'completed_at', type: 'DATETIME' },
    ],
  },

  // ---------- PARCOURS ----------
  journeys: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS journeys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        total_steps INTEGER DEFAULT 3,
        current_step INTEGER DEFAULT 1,
        progress_percent INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'goal_id', type: 'INTEGER NOT NULL' },
      { name: 'user_id', type: 'INTEGER NOT NULL' },
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'total_steps', type: 'INTEGER DEFAULT 3' },
      { name: 'current_step', type: 'INTEGER DEFAULT 1' },
      { name: 'progress_percent', type: 'INTEGER DEFAULT 0' },
      { name: 'status', type: 'TEXT DEFAULT "active"' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'completed_at', type: 'DATETIME' },
    ],
  },
    journey_steps: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS journey_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journey_id INTEGER NOT NULL,
        step_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        mission_text TEXT NOT NULL,
        success_criteria TEXT,
        estimated_minutes INTEGER DEFAULT 15,
        status TEXT DEFAULT 'locked',
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        how_to TEXT,
        why TEXT,
        tip TEXT,
        FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'journey_id', type: 'INTEGER NOT NULL' },
      { name: 'step_number', type: 'INTEGER NOT NULL' },
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'mission_text', type: 'TEXT NOT NULL' },
      { name: 'success_criteria', type: 'TEXT' },
      { name: 'estimated_minutes', type: 'INTEGER DEFAULT 15' },
      { name: 'status', type: 'TEXT DEFAULT "locked"' },
      { name: 'completed_at', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'how_to', type: 'TEXT' },
      { name: 'why', type: 'TEXT' },
      { name: 'tip', type: 'TEXT' },
    ],
  },
  // ============================================================
  // ⭐ NOUVEAU : VALEUR ENRICHIE DES PRODUITS
  // ============================================================
  product_value: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_value (
        product_id            INTEGER PRIMARY KEY,
        learning_objectives   TEXT,
        target_audience       TEXT,
        difficulty_level      TEXT,
        estimated_duration    INTEGER,
        included_resources    TEXT,
        bonus_count           INTEGER DEFAULT 0,
        related_products      TEXT,
        learning_path_id      INTEGER,
        has_audio             INTEGER DEFAULT 0,
        has_video             INTEGER DEFAULT 0,
        has_summary           INTEGER DEFAULT 0,
        has_exercises         INTEGER DEFAULT 0,
        has_certificate       INTEGER DEFAULT 0,
        has_updates           INTEGER DEFAULT 0,
        updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'learning_objectives', type: 'TEXT' },
      { name: 'target_audience', type: 'TEXT' },
      { name: 'difficulty_level', type: 'TEXT' },
      { name: 'estimated_duration', type: 'INTEGER' },
      { name: 'included_resources', type: 'TEXT' },
      { name: 'bonus_count', type: 'INTEGER DEFAULT 0' },
      { name: 'related_products', type: 'TEXT' },
      { name: 'learning_path_id', type: 'INTEGER' },
      { name: 'has_audio', type: 'INTEGER DEFAULT 0' },
      { name: 'has_video', type: 'INTEGER DEFAULT 0' },
      { name: 'has_summary', type: 'INTEGER DEFAULT 0' },
      { name: 'has_exercises', type: 'INTEGER DEFAULT 0' },
      { name: 'has_certificate', type: 'INTEGER DEFAULT 0' },
      { name: 'has_updates', type: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ============================================================
  // ⭐ NOUVEAU : PARCOURS D'APPRENTISSAGE (éditoriaux, pas user)
  // ============================================================
  learning_paths: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS learning_paths (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        slug         TEXT UNIQUE NOT NULL,
        title        TEXT NOT NULL,
        subtitle     TEXT,
        description  TEXT,
        cover_image  TEXT,
        level        TEXT,
        step_count   INTEGER DEFAULT 0,
        price_bundle INTEGER,
        is_active    INTEGER DEFAULT 1,
        position     INTEGER DEFAULT 0,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'slug', type: 'TEXT UNIQUE NOT NULL' },
      { name: 'title', type: 'TEXT NOT NULL' },
      { name: 'subtitle', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'cover_image', type: 'TEXT' },
      { name: 'level', type: 'TEXT' },
      { name: 'step_count', type: 'INTEGER DEFAULT 0' },
      { name: 'price_bundle', type: 'INTEGER' },
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'position', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  learning_path_steps: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS learning_path_steps (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        path_id      INTEGER NOT NULL,
        product_id   INTEGER NOT NULL,
        step_number  INTEGER NOT NULL,
        title        TEXT,
        description  TEXT,
        is_optional  INTEGER DEFAULT 0,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(path_id, step_number)
      )
    `,
    columns: [
      { name: 'path_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'step_number', type: 'INTEGER NOT NULL' },
      { name: 'title', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'is_optional', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  product_impressions: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_impressions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id   TEXT,
        user_id      INTEGER,
        product_id   INTEGER NOT NULL,
        section      TEXT NOT NULL,
        position     INTEGER NOT NULL,
        device       TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'visitor_id', type: 'TEXT' },
      { name: 'user_id',    type: 'INTEGER' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'section',    type: 'TEXT NOT NULL' },
      { name: 'position',   type: 'INTEGER NOT NULL' },
      { name: 'device',     type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  product_events: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id   TEXT,
        user_id      INTEGER,
        product_id   INTEGER NOT NULL,
        event_type   TEXT NOT NULL,
        metadata     TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'visitor_id', type: 'TEXT' },
      { name: 'user_id',    type: 'INTEGER' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'event_type', type: 'TEXT NOT NULL' },
      { name: 'metadata',   type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  // ============================================================
  // ⭐ NOUVEAU : VUES ANONYMES (complète user_product_views)
  // ============================================================
  product_views: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS product_views (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id   INTEGER NOT NULL,
        user_id      INTEGER,
        session_id   TEXT,
        source       TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'session_id', type: 'TEXT' },
      { name: 'source', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },

  // ---------- RECOMMANDATIONS DE PRODUITS PAR MISSION ----------
  step_recommendations: {
    createSQL: `
      CREATE TABLE IF NOT EXISTS step_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        step_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        relevance_score INTEGER DEFAULT 100,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (step_id) REFERENCES journey_steps(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
    columns: [
      { name: 'step_id', type: 'INTEGER NOT NULL' },
      { name: 'product_id', type: 'INTEGER NOT NULL' },
      { name: 'relevance_score', type: 'INTEGER DEFAULT 100' },
      { name: 'reason', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
}
 
 
 



// ============================================================
// MIGRATION PRINCIPALE
// ============================================================

async function migrateTables(db: Database) {
  console.log('🔄 Vérification des tables et migration des colonnes...')

  // Supprimer les anciennes tables problématiques avec camelCase
  try {
    const tablesToCheck = ['orders', 'purchases', 'user_activities', 'user_favorites', 'user_cart', 'user_recommendations', 'payment_logs', 'admin_activity_logs']
    
    for (const table of tablesToCheck) {
      try {
        const columns = await db.all(`SELECT name FROM pragma_table_info('${table}')`)
        const columnNames = columns.map((col: any) => col.name)
        
        if (columnNames.includes('userId') || columnNames.includes('productId')) {
          console.log(`⚠️ Table ${table} avec colonnes camelCase détectée, recréation...`)
          await db.exec(`DROP TABLE IF EXISTS ${table}`)
          console.log(`✅ Table ${table} supprimée`)
        }
      } catch (e) {
        // Table n'existe pas
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur lors de la vérification des tables:', error)
  }

  // Créer toutes les tables
  for (const [tableName, def] of Object.entries(tableDefinitions)) {
    await ensureTable(db, tableName, def.createSQL, def.columns)
  }

  // ============================================================
  // CRÉATION DES INDEX
  // ============================================================

  try {
    console.log('📌 Création des index...')

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)',
      'CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)',
      'CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug)',
      'CREATE INDEX IF NOT EXISTS idx_collections_is_active ON collections(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code)',
      'CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_flash_sales_is_active ON flash_sales(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)',
      'CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_homepage_sections_is_active ON homepage_sections(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_homepage_sections_position ON homepage_sections(position)',
      'CREATE INDEX IF NOT EXISTS idx_section_stats_section_id ON section_stats(section_id)',
      'CREATE INDEX IF NOT EXISTS idx_section_stats_date ON section_stats(date)',
      'CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)',
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured)',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)',
      'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_download_token ON orders(download_token)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_product_views_user_id ON user_product_views(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_product_views_product_id ON user_product_views(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)',
      'CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action)',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_expires_at ON download_tokens(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_order_id ON download_tokens(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_library_user_id ON library(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_library_product_id ON library(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON payment_events(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_licenses_code ON licenses(code)',
      'CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON licenses(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_access_user_id ON group_access(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_group_access_product_id ON group_access(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code)',
      'CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code)',
      'CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhooks(processed)',
      'CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_guest_cart_items_session_id ON guest_cart_items(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_banners_starts_at ON banners(starts_at)',
      'CREATE INDEX IF NOT EXISTS idx_banners_ends_at ON banners(ends_at)',
      'CREATE INDEX IF NOT EXISTS idx_seasonal_messages_is_active ON seasonal_messages(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_seasonal_messages_starts_at ON seasonal_messages(starts_at)',
      'CREATE INDEX IF NOT EXISTS idx_seasonal_messages_ends_at ON seasonal_messages(ends_at)',
      'CREATE INDEX IF NOT EXISTS idx_advertisements_is_active ON advertisements(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_advertisements_category_id ON advertisements(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns(start_date)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date)',
      'CREATE INDEX IF NOT EXISTS idx_slides_campaign_id ON slides(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_slides_position ON slides(position)',
      'CREATE INDEX IF NOT EXISTS idx_media_library_campaign_id ON media_library(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_media_library_file_type ON media_library(file_type)',
      'CREATE INDEX IF NOT EXISTS idx_campaign_stats_campaign_id ON campaign_stats(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_campaign_stats_date ON campaign_stats(date)',
      'CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON admin_accounts(email)', 
      'CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug)',
      'CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)',
      'CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module)',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_profile_logs_user_id ON user_profile_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_profile_logs_changed_by ON user_profile_logs(changed_by)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created ON newsletter_subscribers(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_templates_type ON newsletter_templates(type)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_messages_subscriber ON newsletter_messages(subscriber_id)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_messages_sent ON newsletter_messages(sent_at)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_reads_message ON newsletter_reads(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_reads_subscriber ON newsletter_reads(subscriber_id)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_sent ON newsletter_campaigns(sent_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_product_value_difficulty ON product_value(difficulty_level)',
      'CREATE INDEX IF NOT EXISTS idx_learning_paths_slug ON learning_paths(slug)',
      'CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON learning_paths(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_lp_steps_path_id ON learning_path_steps(path_id)',
      'CREATE INDEX IF NOT EXISTS idx_lp_steps_product_id ON learning_path_steps(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_product_views_product_date ON product_views(product_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_product_views_session ON product_views(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_collections_product_ids ON collections(product_ids)',
      'CREATE INDEX IF NOT EXISTS idx_imp_visitor ON product_impressions(visitor_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_imp_user ON product_impressions(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_imp_product ON product_impressions(product_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_imp_section ON product_impressions(section, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ev_visitor ON product_events(visitor_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ev_user ON product_events(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ev_product ON product_events(product_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ev_type ON product_events(event_type, created_at)',
       
    ] 

    for (const query of indexQueries) {
      try {
        await db.exec(query)
      } catch (err: unknown) {
        // 🔥 CORRECTION : `err` est `unknown`, on doit vérifier son type
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`   ⚠️ Index non créé : ${message}`)
      }
    }

    console.log('✅ Index créés avec succès')

  } catch (error) {
    console.warn('⚠️ Certains index n\'ont pas pu être créés :', error)
  }
  
  // ============================================================
  // 🟢🟢🟢 INSÉRER LES TEMPLATES PAR DÉFAUT - ICI ! 🟢🟢🟢
  // ============================================================
  
  try {
    await db.exec(`
      INSERT OR IGNORE INTO newsletter_templates (name, subject, content, type, category) VALUES 
      (
        'Bienvenue',
        'Bienvenue sur TorrentTwist !',
        '<h1>Bonjour {{nom}} !</h1><p>Bienvenue sur TorrentTwist, la plateforme de produits numériques.</p><p>Nous sommes ravis de vous compter parmi nos abonnés.</p><p>À très bientôt,<br>L''équipe TorrentTwist</p>',
        'admin',
        'welcome'
      ),
      (
        'Recommandation IA',
        '📚 Notre recommandation pour vous',
        '<h2>Bonjour {{nom}},</h2><p>Notre agent IA a sélectionné pour vous :</p><h3>{{interet}}</h3><p>Nous pensons que ce livre pourrait vous intéresser.</p><p>Découvrez-le dès maintenant !</p>',
        'ai',
        'recommendation'
      ),
      (
        'Offre spéciale',
        '🎉 Offre spéciale pour vous !',
        '<h2>Bonjour {{nom}},</h2><p>Profitez de notre offre spéciale : {{offre}}</p><p>Valable jusqu''à {{date}}</p>',
        'both',
        'promotion'
      )
    `);
    console.log('✅ Templates par défaut insérés');
  } catch (error) {
    console.warn('⚠️ Erreur insertion templates:', error);
  }
  // ============================================================
  // INSERTION DES DEVISES PAR DÉFAUT
  // ============================================================

  try {
    await db.exec(`
      INSERT OR IGNORE INTO currencies (code, name, symbol, rate_to_default, is_default)
      VALUES 
        ('FCFA', 'Franc CFA', 'CFA', 1.0, 1),
        ('USD', 'Dollar US', '$', 0.00165, 0),
        ('EUR', 'Euro', '€', 0.00152, 0),
        ('GBP', 'Livre Sterling', '£', 0.00131, 0),
        ('NGN', 'Naira', '₦', 0.00131, 0),
        ('KES', 'Shilling Kenya', 'KSh', 0.00131, 0)
    `)
    console.log('✅ Devises par défaut insérées')
  } catch (error) {
    console.warn('⚠️ Erreur insertion devises :', error)
  }
    // ============================================================
  // INSERTION DES RÔLES ET PERMISSIONS PAR DÉFAUT
  // ============================================================

  try {
    // Rôles par défaut
    await db.exec(`
      INSERT OR IGNORE INTO roles (name, slug, description)
      VALUES
        ('Administrateur', 'admin', 'Accès total à toutes les fonctionnalités'),
        ('Gestionnaire', 'manager', 'Gestion des produits et commandes'),
        ('Éditeur', 'editor', 'Gestion du contenu et des pages'),
        ('Support', 'support', 'Gestion des tickets et commandes'),
        ('Utilisateur', 'user', 'Accès au front-office uniquement')
    `);

    // Permissions par défaut (exemples)
    await db.exec(`
      INSERT OR IGNORE INTO permissions (name, description, module)
      VALUES
        ('products:view', 'Voir les produits', 'products'),
        ('products:create', 'Créer des produits', 'products'),
        ('products:edit', 'Modifier des produits', 'products'),
        ('products:delete', 'Supprimer des produits', 'products'),
        ('users:view', 'Voir les utilisateurs', 'users'),
        ('users:create', 'Créer des utilisateurs', 'users'),
        ('users:edit', 'Modifier des utilisateurs', 'users'),
        ('users:delete', 'Supprimer des utilisateurs', 'users'),
        ('orders:view', 'Voir les commandes', 'orders'),
        ('orders:edit', 'Modifier les commandes', 'orders'),
        ('orders:delete', 'Supprimer des commandes', 'orders'),
        ('reviews:view', 'Voir les avis', 'reviews'),
        ('reviews:moderate', 'Modérer les avis', 'reviews'),
        ('categories:view', 'Voir les catégories', 'categories'),
        ('categories:create', 'Créer des catégories', 'categories'),
        ('categories:edit', 'Modifier des catégories', 'categories'),
        ('categories:delete', 'Supprimer des catégories', 'categories'),
        ('settings:view', 'Voir les paramètres', 'settings'),
        ('settings:edit', 'Modifier les paramètres', 'settings'),
        ('roles:view', 'Voir les rôles', 'roles'),
        ('roles:create', 'Créer des rôles', 'roles'),
        ('roles:edit', 'Modifier des rôles', 'roles'),
        ('roles:delete', 'Supprimer des rôles', 'roles')
    `);

    console.log('✅ Rôles et permissions par défaut insérés');
  } catch (error) {
    console.warn('⚠️ Erreur insertion rôles/permissions par défaut :', error);
  }
  try {
    const adminExists = await db.get('SELECT id FROM admin_accounts LIMIT 1')
    if (!adminExists) {
      const defaultPassword = 'Admin123!'
      const hashedPassword = await bcrypt.hash(defaultPassword, 10)
      await db.run(`
        INSERT INTO admin_accounts (email, passwordHash, name, role, isActive)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin@torrenttwist.com', hashedPassword, 'Administrateur', 'admin', 1])
      console.log('✅ Compte admin par défaut créé (admin@torrenttwist.com / Admin123!)')
    }
  } catch (error) {
    console.warn('⚠️ Erreur insertion admin par défaut :', error)
  }

  console.log('✅ Migration terminée avec succès')
}

// ============================================================
// UTILITAIRES SUPPLÉMENTAIRES
// ============================================================

export function generateDownloadToken(): string {
  return randomBytes(32).toString('hex')
}

export function getTokenExpiry(days: number = 30): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export async function recordProductView(userId: number, productId: number) {
  const db = await getDB()
  await db.run(
    `INSERT INTO user_product_views (user_id, product_id, viewed_at) VALUES (?, ?, datetime('now'))`,
    [userId, productId]
  )
}