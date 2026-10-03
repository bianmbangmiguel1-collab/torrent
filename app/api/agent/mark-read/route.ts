// app/api/agent/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface MarkReadBody {
  messageId: number | string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messageId, email } =
      (await request.json()) as MarkReadBody;

    if (!messageId || !email) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const db = await getDB();

    const subscriber = await db.get(
      'SELECT id FROM newsletter_subscribers WHERE email = ? AND status = "active"',
      [email]
    );

    if (!subscriber) {
      return NextResponse.json({ error: 'Abonné non trouvé' }, { status: 404 });
    }

    await db.run(
      `INSERT OR IGNORE INTO newsletter_reads (message_id, subscriber_id, read_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [messageId, subscriber.id]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur mark-read:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}