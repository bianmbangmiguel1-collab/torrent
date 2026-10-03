// app/api/admin/newsletter/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();

    // Statistiques
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM newsletter_subscribers) as total_subscribers,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active' AND opt_in = 1) as active_subscribers,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'inactive' OR opt_in = 0) as inactive_subscribers,
        (SELECT COUNT(*) FROM newsletter_templates) as total_templates,
        (SELECT COUNT(*) FROM newsletter_messages) as total_campaigns,
        (SELECT COUNT(*) FROM newsletter_messages WHERE status = 'sent') as sent_messages,
        (SELECT AVG(engagement_score) FROM newsletter_subscribers WHERE engagement_score > 0) as engagement_avg,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE analysis IS NOT NULL) as ai_analyzed,
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE analysis IS NULL AND status = 'active') as pending_analysis,
        ROUND(
          (SELECT COUNT(*) FROM newsletter_reads) * 100.0 / 
          (SELECT COUNT(*) FROM newsletter_messages WHERE status = 'sent')
        , 1) as open_rate
    `);

    // Activités récentes
    const activities = await db.all(`
      SELECT 
        'subscriber' as type,
        'Nouvel abonné: ' || email as details,
        created_at
      FROM newsletter_subscribers 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    const campaignActivities = await db.all(`
      SELECT 
        'campaign' as type,
        'Campagne envoyée: ' || subject as details,
        sent_at as created_at
      FROM newsletter_messages 
      ORDER BY sent_at DESC 
      LIMIT 5
    `);

    const allActivities = [...activities, ...campaignActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        open_rate: stats.open_rate || 0,
        engagement_avg: Math.round(stats.engagement_avg || 0)
      },
      activities: allActivities
    });

  } catch (error) {
    console.error('Erreur dashboard:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}