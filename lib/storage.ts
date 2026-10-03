// lib/storage.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ------------------------------------------------------------
// CLIENT SUPABASE (créé à l'appel, pas au chargement)
// ------------------------------------------------------------
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const url = process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase non configuré : SUPABASE_URL et SUPABASE_SECRET_KEY requis.'
    )
  }

  _supabase = createClient(url, key)
  return _supabase
}

// Bucket privé pour les fichiers (PDF, ZIP, etc.)
const BUCKET_FILES = 'products'

// Bucket public pour les images produits
const BUCKET_IMAGES = 'product-images'

// ============================================================
// UPLOAD — FICHIERS (privé)
// ============================================================
export async function uploadToSupabase(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from(BUCKET_FILES)
    .upload(key, body, { contentType, upsert: true })

  if (error) throw new Error(`Upload Supabase: ${error.message}`)
  return key
}

// ============================================================
// UPLOAD — IMAGES (public)
// ============================================================
export async function uploadImageToSupabase(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from(BUCKET_IMAGES)
    .upload(key, body, { contentType, upsert: true })

  if (error) throw new Error(`Upload image Supabase: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET_IMAGES).getPublicUrl(key)
  return data.publicUrl
}

// ============================================================
// URL SIGNÉE — FICHIERS (privé)
// ============================================================
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600,
  filename?: string
): Promise<string> {
  const supabase = getSupabase()

  const options = filename ? { download: filename } : undefined

  const { data, error } = await supabase.storage
    .from(BUCKET_FILES)
    .createSignedUrl(key, expiresIn, options)

  if (error) throw new Error(`URL signée: ${error.message}`)
  return data.signedUrl
}

// ============================================================
// SUPPRESSION — FICHIERS
// ============================================================
export async function deleteFromSupabase(key: string): Promise<void> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.storage.from(BUCKET_FILES).remove([key])
    if (error) console.warn('⚠️ deleteFromSupabase:', error.message)
  } catch (err) {
    console.warn('⚠️ deleteFromSupabase:', err)
  }
}

// ============================================================
// SUPPRESSION — IMAGES
// ============================================================
export async function deleteImageFromSupabase(key: string): Promise<void> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.storage.from(BUCKET_IMAGES).remove([key])
    if (error) console.warn('⚠️ deleteImageFromSupabase:', error.message)
  } catch (err) {
    console.warn('⚠️ deleteImageFromSupabase:', err)
  }
}

// ============================================================
// UTILITAIRE : extraire la clé depuis une URL publique
// ============================================================
export function extractKeyFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET_IMAGES}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return url.substring(index + marker.length)
}