// lib/campaign-service.ts
'use server';

import type { Campaign, Slide } from './types';
import { getDB } from './db';

export async function getActiveCampaigns(device?: 'desktop' | 'tablet' | 'mobile'): Promise<Campaign[]> {
  const db = await getDB();
  const now = new Date().toISOString();

  const campaigns = await db.all(
    `SELECT * FROM campaigns 
     WHERE status = 'active' 
       AND (start_date IS NULL OR start_date <= ?)
       AND (end_date IS NULL OR end_date >= ?)
     ORDER BY created_at DESC`,
    [now, now]
  );

  if (campaigns.length === 0) return [];

  const result: Campaign[] = [];
  for (const campaign of campaigns) {
    let devices = [];
    try {
      devices = JSON.parse(campaign.devices || '["desktop","tablet","mobile"]');
    } catch {
      devices = ['desktop', 'tablet', 'mobile'];
    }
    if (device && !devices.includes(device)) continue;

    const slides = await db.all(
      `SELECT * FROM slides WHERE campaign_id = ? ORDER BY position ASC`,
      [campaign.id]
    );

    result.push({
      ...campaign,
      slides: slides || [],
    });
  }

  return result;
}