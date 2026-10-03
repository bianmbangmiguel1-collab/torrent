export const dynamic = 'force-dynamic';

// app/api/admin/newsletter/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    let query = 'SELECT * FROM newsletter_campaigns WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR subject LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const campaigns = await db.all(query, params);

    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM newsletter_campaigns
    `);

    const campaignsWithRates = campaigns.map((c: any) => ({
      ...c,
      open_rate: c.recipients_count > 0 ? Math.round((c.opens_count / c.recipients_count) * 100) : 0,
      click_rate: c.recipients_count > 0 ? Math.round((c.clicks_count / c.recipients_count) * 100) : 0
    }));

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithRates,
      total: stats.total || 0,
      sent: stats.sent || 0,
      draft: stats.draft || 0,
      scheduled: stats.scheduled || 0,
      failed: stats.failed || 0
    });

  } catch (error) {
    console.error('Erreur récupération campagnes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// Types
// ============================================================
interface CreateCampaignBody {
  name: string
  subject: string
  content: string
  template_id?: number | string | null
  status?: string
  scheduled_at?: string | null
  recipients?: Array<number | string>
  ai_personalization?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCampaignBody;
    const { 
      name, 
      subject, 
      content, 
      template_id, 
      status, 
      scheduled_at, 
      recipients,
      ai_personalization 
    } = body;

    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const db = await getDB();

    let recipientIds = recipients;
    if (!recipientIds || recipientIds.length === 0) {
      const subs = await db.all('SELECT id FROM newsletter_subscribers WHERE status = "active" AND opt_in = 1');
      recipientIds = subs.map((s: any) => String(s.id));
    }

    const currentStatus = scheduled_at ? 'scheduled' : (status || 'sent');

    const result = await db.run(`
      INSERT INTO newsletter_campaigns (
        name, subject, content, template_id, status, 
        scheduled_at, recipients_count, sent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      name, 
      subject, 
      content, 
      template_id || null, 
      currentStatus,
      scheduled_at || null,
      recipientIds.length,
      currentStatus === 'sent' ? new Date().toISOString() : null
    ]);

    // Si la campagne est envoyée immédiatement
    if (currentStatus === 'sent' && !scheduled_at) {
      await db.run(`
        UPDATE newsletter_campaigns 
        SET sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [result.lastID]);
    }

    return NextResponse.json({
      success: true,
      campaign: { id: result.lastID, name, subject, content }
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur création campagne:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const db = await getDB();
    await db.run('DELETE FROM newsletter_campaigns WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression campagne:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}