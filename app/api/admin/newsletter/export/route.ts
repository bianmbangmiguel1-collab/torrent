// app/api/admin/newsletter/export/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { exportSubscribers } from '@/lib/services/newsletter';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const source = searchParams.get('source') || 'all';
    const country = searchParams.get('country') || 'all';

    const subscribers = await exportSubscribers({ status, source, country });

    // Générer CSV
    const headers = ['ID', 'Email', 'Nom', 'Téléphone', 'Pays', 'Statut', 'Source', 'Opt-In', 'Inscrit le', 'Dernier envoi'];
    const rows = subscribers.map(s => [
      s.id,
      s.email,
      s.name || '',
      s.phone || '',
      s.country || '',
      s.status,
      s.source || '',
      s.opt_in ? 'Oui' : 'Non',
      new Date(s.subscribed_at).toLocaleDateString(),
      s.last_sent_at ? new Date(s.last_sent_at).toLocaleDateString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=abonnes_${new Date().toISOString().slice(0,10)}.csv`,
      },
    });
  } catch (error) {
    console.error('❌ Erreur export:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}