// app/api/admin/newsletter/analytics/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();

    // Récupérer toutes les campagnes
    const campaigns = await db.all(`
      SELECT 
        id, name, subject, status, 
        recipients_count, opens_count, clicks_count, unsubscribes_count,
        sent_at, created_at
      FROM newsletter_campaigns
      ORDER BY created_at DESC
    `);

    // Générer CSV
    const headers = ['ID', 'Nom', 'Sujet', 'Statut', 'Destinataires', 'Ouvertures', 'Clics', 'Désabonnements', 'Taux d\'ouverture', 'Date d\'envoi', 'Date de création'];
    const rows = campaigns.map((c: any) => [
      c.id,
      c.name,
      c.subject,
      c.status,
      c.recipients_count || 0,
      c.opens_count || 0,
      c.clicks_count || 0,
      c.unsubscribes_count || 0,
      c.recipients_count > 0 ? Math.round((c.opens_count / c.recipients_count) * 100) + '%' : '0%',
      c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '-',
      new Date(c.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=newsletter_analytics_${new Date().toISOString().slice(0,10)}.csv`,
      },
    });
  } catch (error) {
    console.error('Erreur export:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}