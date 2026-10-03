// lib/admin-actions.ts
'use server';

import { getDB } from './db';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------
// CLIENT SUPABASE (créé à la demande, pas au chargement)
// ------------------------------------------------------------
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL ou SUPABASE_SECRET_KEY manquant');
  }
  return createClient(url, key);
}

// ------------------------------------------------------------
// UTILITAIRE : uploader un fichier vers Supabase Storage
// ------------------------------------------------------------
async function saveFile(file: File, folder: string = 'campaigns'): Promise<string> {
  const supabase = getSupabase();

  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const filename = `${folder}/${timestamp}-${random}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('uploads')
    .upload(filename, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    console.error('❌ Erreur upload Supabase:', error);
    throw new Error('Upload échoué: ' + error.message);
  }

  const { data } = supabase.storage.from('uploads').getPublicUrl(filename);
  return data.publicUrl;
}

// ------------------------------------------------------------
// UTILITAIRE : supprimer un fichier de Supabase Storage
// ------------------------------------------------------------
async function deleteFileFromStorage(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return;
  try {
    const marker = '/uploads/';
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = publicUrl.slice(idx + marker.length);

    const supabase = getSupabase();
    const { error } = await supabase.storage.from('uploads').remove([filePath]);
    if (error) console.warn('⚠️ Suppression storage:', error.message);
  } catch (e) {
    console.warn('⚠️ Erreur suppression storage:', e);
  }
}

// ------------------------------------------------------------
// BANNIÈRES
// ------------------------------------------------------------
export async function getBanners() {
  const db = await getDB();
  return db.all('SELECT * FROM banners ORDER BY position ASC');
}

export async function createBanner(formData: FormData) {
  const db = await getDB();
  const title = formData.get('title') as string;
  const description = (formData.get('description') as string) || null;
  const media_type = (formData.get('media_type') as string) || 'image';
  const link_url = (formData.get('link_url') as string) || null;
  const position = parseInt(formData.get('position') as string) || 0;
  const is_active = formData.get('is_active') === '1' ? 1 : 0;
  const starts_at = (formData.get('starts_at') as string) || null;
  const ends_at = (formData.get('ends_at') as string) || null;
  const video_url = (formData.get('video_url') as string) || null;

  let media_url: string | null = null;
  const file = formData.get('media_file') as File | null;
  if (file && file.size > 0) media_url = await saveFile(file, 'banners');

  await db.run(
    `INSERT INTO banners (title, description, media_type, media_url, video_url, link_url, position, is_active, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, media_type, media_url, video_url, link_url, position, is_active, starts_at, ends_at]
  );
  revalidatePath('/admin/banners');
}

export async function updateBanner(id: number, formData: FormData) {
  const db = await getDB();
  const title = formData.get('title') as string;
  const description = (formData.get('description') as string) || null;
  const media_type = (formData.get('media_type') as string) || 'image';
  const link_url = (formData.get('link_url') as string) || null;
  const position = parseInt(formData.get('position') as string) || 0;
  const is_active = formData.get('is_active') === '1' ? 1 : 0;
  const starts_at = (formData.get('starts_at') as string) || null;
  const ends_at = (formData.get('ends_at') as string) || null;
  const video_url = (formData.get('video_url') as string) || null;

  const oldBanner = await db.get<{ media_url: string | null }>(
    'SELECT media_url FROM banners WHERE id = ?',
    [id]
  );
  let media_url = oldBanner?.media_url || null;

  const file = formData.get('media_file') as File | null;
  if (file && file.size > 0) {
    if (media_url) await deleteFileFromStorage(media_url);
    media_url = await saveFile(file, 'banners');
  }

  await db.run(
    `UPDATE banners SET title = ?, description = ?, media_type = ?, media_url = ?, video_url = ?, link_url = ?,
      position = ?, is_active = ?, starts_at = ?, ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, description, media_type, media_url, video_url, link_url, position, is_active, starts_at, ends_at, id]
  );
  revalidatePath('/admin/banners');
}

export async function deleteBanner(id: number) {
  const db = await getDB();
  const banner = await db.get<{ media_url: string | null }>(
    'SELECT media_url FROM banners WHERE id = ?',
    [id]
  );
  if (banner?.media_url) await deleteFileFromStorage(banner.media_url);
  await db.run('DELETE FROM banners WHERE id = ?', [id]);
  revalidatePath('/admin/banners');
}

// ------------------------------------------------------------
// CAMPAGNES
// ------------------------------------------------------------
export async function getCampaigns() {
  const db = await getDB();
  return db.all('SELECT * FROM campaigns ORDER BY created_at DESC');
}

export async function getCampaign(id: number) {
  const db = await getDB();
  const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [id]);
  if (!campaign) return null;
  const slides = await db.all('SELECT * FROM slides WHERE campaign_id = ? ORDER BY position ASC', [id]);
  return { ...campaign, slides };
}

export async function createCampaign(data: any) {
  const db = await getDB();
  const { name, status, type, start_date, end_date, timezone, target_audience, devices, countries, languages, seo_alt, seo_title, contrast_check } = data;
  const result = await db.run(
    `INSERT INTO campaigns 
      (name, status, type, start_date, end_date, timezone, target_audience, devices, countries, languages, seo_alt, seo_title, contrast_check)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, status || 'draft', type || 'carousel', start_date, end_date, timezone || 'Africa/Douala', target_audience || 'all', devices || '["desktop","tablet","mobile"]', countries || null, languages || null, seo_alt || null, seo_title || null, contrast_check ?? 1]
  );
  revalidatePath('/admin/campaigns');
  return result.lastID;
}

export async function updateCampaign(id: number, data: any) {
  const db = await getDB();
  const { name, status, type, start_date, end_date, timezone, target_audience, devices, countries, languages, seo_alt, seo_title, contrast_check } = data;
  await db.run(
    `UPDATE campaigns SET 
      name = ?, status = ?, type = ?, start_date = ?, end_date = ?, timezone = ?, target_audience = ?, devices = ?, countries = ?, languages = ?, seo_alt = ?, seo_title = ?, contrast_check = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, status, type, start_date, end_date, timezone, target_audience, devices, countries, languages, seo_alt, seo_title, contrast_check, id]
  );
  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${id}`);
}

export async function deleteCampaign(id: number) {
  const db = await getDB();
  await db.run('DELETE FROM campaigns WHERE id = ?', [id]);
  revalidatePath('/admin/campaigns');
}

export async function duplicateCampaign(id: number) {
  const db = await getDB();
  const campaign = await db.get<any>('SELECT * FROM campaigns WHERE id = ?', [id]);
  if (!campaign) throw new Error('Campagne introuvable');

  const newName = `${campaign.name} (copie)`;
  const result = await db.run(
    `INSERT INTO campaigns 
      (name, status, type, start_date, end_date, timezone, target_audience, devices, countries, languages, seo_alt, seo_title, contrast_check, created_by)
     VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newName,
      campaign.type,
      campaign.start_date,
      campaign.end_date,
      campaign.timezone,
      campaign.target_audience,
      campaign.devices,
      campaign.countries,
      campaign.languages,
      campaign.seo_alt,
      campaign.seo_title,
      campaign.contrast_check,
      campaign.created_by
    ]
  );
  const newId = result.lastID;

  const slides = await db.all<any>('SELECT * FROM slides WHERE campaign_id = ?', [id]);
  for (const slide of slides) {
    const { id: slideId, campaign_id, ...rest } = slide;
    const columns = Object.keys(rest).join(', ');
    const placeholders = Object.keys(rest).map(() => '?').join(', ');
    const values = Object.values(rest);
    await db.run(
      `INSERT INTO slides (campaign_id, ${columns}) VALUES (?, ${placeholders})`,
      [newId, ...values]
    );
  }

  revalidatePath('/admin/campaigns');
  return newId;
}

// ------------------------------------------------------------
// SLIDES
// ------------------------------------------------------------
export async function getSlide(id: number) {
  const db = await getDB();
  return db.get('SELECT * FROM slides WHERE id = ?', [id]);
}

export async function createSlide(data: any) {
  const db = await getDB();
  const { campaign_id, position, type, title, subtitle, description, cta_text, cta_action, cta_value, media_type, media_url, media_desktop, media_tablet, media_mobile, video_source, video_autoplay, video_muted, video_loop, video_controls, video_max_duration, video_fallback_image, audio_url, audio_autoplay, audio_controls, content_position, content_alignment, overlay_opacity, text_color, button_color, background_color, animation_entrance, animation_text, animation_transition, autoplay_interval, autoplay_pause_on_hover, promotion_id, product_ids, collection_id, category_id } = data;
  const result = await db.run(
    `INSERT INTO slides 
      (campaign_id, position, type, title, subtitle, description, cta_text, cta_action, cta_value, media_type, media_url, media_desktop, media_tablet, media_mobile, video_source, video_autoplay, video_muted, video_loop, video_controls, video_max_duration, video_fallback_image, audio_url, audio_autoplay, audio_controls, content_position, content_alignment, overlay_opacity, text_color, button_color, background_color, animation_entrance, animation_text, animation_transition, autoplay_interval, autoplay_pause_on_hover, promotion_id, product_ids, collection_id, category_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [campaign_id, position || 0, type || 'image', title, subtitle, description, cta_text, cta_action, cta_value, media_type || 'image', media_url, media_desktop, media_tablet, media_mobile, video_source, video_autoplay ?? 0, video_muted ?? 1, video_loop ?? 0, video_controls ?? 1, video_max_duration || 15, video_fallback_image, audio_url, audio_autoplay ?? 0, audio_controls ?? 1, content_position || 'center', content_alignment || 'center', overlay_opacity || 65, text_color || '#ffffff', button_color || '#2563eb', background_color || 'rgba(0,0,0,0.5)', animation_entrance || 'fade', animation_text || 'fade-up', animation_transition || 'fade', autoplay_interval || 5, autoplay_pause_on_hover ?? 1, promotion_id, product_ids ? JSON.stringify(product_ids) : null, collection_id, category_id]
  );
  revalidatePath(`/admin/campaigns/${campaign_id}`);
  return result.lastID;
}

export async function updateSlide(id: number, data: any) {
  const db = await getDB();
  const { campaign_id, position, type, title, subtitle, description, cta_text, cta_action, cta_value, media_type, media_url, media_desktop, media_tablet, media_mobile, video_source, video_autoplay, video_muted, video_loop, video_controls, video_max_duration, video_fallback_image, audio_url, audio_autoplay, audio_controls, content_position, content_alignment, overlay_opacity, text_color, button_color, background_color, animation_entrance, animation_text, animation_transition, autoplay_interval, autoplay_pause_on_hover, promotion_id, product_ids, collection_id, category_id } = data;
  await db.run(
    `UPDATE slides SET 
      campaign_id = ?, position = ?, type = ?, title = ?, subtitle = ?, description = ?, cta_text = ?, cta_action = ?, cta_value = ?, media_type = ?, media_url = ?, media_desktop = ?, media_tablet = ?, media_mobile = ?, video_source = ?, video_autoplay = ?, video_muted = ?, video_loop = ?, video_controls = ?, video_max_duration = ?, video_fallback_image = ?, audio_url = ?, audio_autoplay = ?, audio_controls = ?, content_position = ?, content_alignment = ?, overlay_opacity = ?, text_color = ?, button_color = ?, background_color = ?, animation_entrance = ?, animation_text = ?, animation_transition = ?, autoplay_interval = ?, autoplay_pause_on_hover = ?, promotion_id = ?, product_ids = ?, collection_id = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [campaign_id, position, type, title, subtitle, description, cta_text, cta_action, cta_value, media_type, media_url, media_desktop, media_tablet, media_mobile, video_source, video_autoplay, video_muted, video_loop, video_controls, video_max_duration, video_fallback_image, audio_url, audio_autoplay, audio_controls, content_position, content_alignment, overlay_opacity, text_color, button_color, background_color, animation_entrance, animation_text, animation_transition, autoplay_interval, autoplay_pause_on_hover, promotion_id, product_ids ? JSON.stringify(product_ids) : null, collection_id, category_id, id]
  );
  revalidatePath(`/admin/campaigns/${campaign_id}`);
}

export async function deleteSlide(id: number) {
  const db = await getDB();
  const slide = await db.get<any>('SELECT campaign_id FROM slides WHERE id = ?', [id]);
  await db.run('DELETE FROM slides WHERE id = ?', [id]);
  if (slide) revalidatePath(`/admin/campaigns/${slide.campaign_id}`);
}

export async function reorderSlides(campaignId: number, slideIds: number[]) {
  const db = await getDB();
  for (let i = 0; i < slideIds.length; i++) {
    await db.run('UPDATE slides SET position = ? WHERE id = ?', [i, slideIds[i]]);
  }
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

// ------------------------------------------------------------
// MÉDIATHÈQUE
// ------------------------------------------------------------
export async function uploadMedia(file: File, name?: string, alt?: string, campaignId?: number) {
  const db = await getDB();
  const filePath = await saveFile(file, 'media');
  const mime = file.type;
  const size = file.size;
  const result = await db.run(
    `INSERT INTO media_library (name, file_path, file_type, mime_type, size, alt, campaign_id, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name || file.name, filePath, file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio', mime, size, alt || null, campaignId || null, 1]
  );
  revalidatePath('/admin/campaigns');
  return { id: result.lastID, path: filePath };
}

export async function getMediaLibrary(filters?: any) {
  const db = await getDB();
  const query = 'SELECT * FROM media_library ORDER BY created_at DESC';
  return db.all(query);
}

export async function deleteMedia(id: number) {
  const db = await getDB();
  const media = await db.get<{ file_path: string | null }>(
    'SELECT file_path FROM media_library WHERE id = ?',
    [id]
  );
  if (media?.file_path) await deleteFileFromStorage(media.file_path);
  await db.run('DELETE FROM media_library WHERE id = ?', [id]);
  revalidatePath('/admin/campaigns');
}

// ------------------------------------------------------------
// STATISTIQUES DES CAMPAGNES
// ------------------------------------------------------------
export async function getCampaignStats(campaignId?: number) {
  const db = await getDB();
  if (campaignId) {
    return db.all('SELECT * FROM campaign_stats WHERE campaign_id = ? ORDER BY date DESC', [campaignId]);
  }
  const stats = await db.all(`
    SELECT 
      SUM(impressions) as total_impressions,
      SUM(views) as total_views,
      SUM(clicks) as total_clicks,
      SUM(add_to_cart) as total_add_to_cart,
      SUM(purchases) as total_purchases,
      SUM(revenue) as total_revenue,
      AVG(ctr) as avg_ctr
    FROM campaign_stats
  `);
  return stats[0] || { total_impressions: 0, total_views: 0, total_clicks: 0, total_add_to_cart: 0, total_purchases: 0, total_revenue: 0, avg_ctr: 0 };
}

export async function getCampaignStatsPerCampaign() {
  const db = await getDB();
  return db.all(`
    SELECT 
      c.id,
      c.name,
      c.status,
      SUM(cs.impressions) as impressions,
      SUM(cs.views) as views,
      SUM(cs.clicks) as clicks,
      SUM(cs.add_to_cart) as add_to_cart,
      SUM(cs.purchases) as purchases,
      SUM(cs.revenue) as revenue,
      AVG(cs.ctr) as ctr
    FROM campaigns c
    LEFT JOIN campaign_stats cs ON c.id = cs.campaign_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
}