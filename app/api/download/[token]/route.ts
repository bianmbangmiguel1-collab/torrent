// lib/storage.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const BUCKET = 'products'

export async function uploadToSupabase(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, body, { contentType, upsert: true })

  if (error) throw new Error(`Upload Supabase: ${error.message}`)
  return key
}

/**
 * Génère une URL signée valide N secondes.
 * Si `filename` est fourni, force le téléchargement avec ce nom.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600,
  filename?: string
): Promise<string> {
  const options = filename ? { download: filename } : undefined

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, expiresIn, options)

  if (error) throw new Error(`URL signée: ${error.message}`)
  return data.signedUrl
}

export async function deleteFromSupabase(key: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([key])
    if (error) console.warn('⚠️ deleteFromSupabase:', error.message)
  } catch (err) {
    console.warn('⚠️ deleteFromSupabase:', err)
  }
}