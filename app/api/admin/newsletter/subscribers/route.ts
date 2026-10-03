// app/api/admin/newsletter/subscribers/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Vérifier admin (token dans cookies)
    const token = request.cookies.get('admin_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDB();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    let query = 'SELECT * FROM newsletter_subscribers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (email LIKE ? OR name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const subscribers = await db.all(query, params);
    
    // Statistiques
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' AND opt_in = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' OR opt_in = 0 THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN analysis IS NOT NULL THEN 1 ELSE 0 END) as analyzed,
        AVG(engagement_score) as engagement_avg
      FROM newsletter_subscribers
    `);

    return NextResponse.json({
      success: true,
      subscribers,
      total: stats.total || 0,
      active: stats.active || 0,
      inactive: stats.inactive || 0,
      analyzed: stats.analyzed || 0,
      engagement_avg: Math.round(stats.engagement_avg || 0)
    });

  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}