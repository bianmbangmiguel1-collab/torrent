// app/api/agent/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface MessagesRequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email } =
      (await request.json()) as MessagesRequestBody;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email requis'
      }, { status: 400 });
    }

    const db = await getDB();

    // 🔥 Récupérer l'abonné
    const subscriber = await db.get(`
      SELECT id, email, name FROM newsletter_subscribers WHERE email = ? AND status = 'active'
    `, [email]);

    if (!subscriber) {
      console.log(`⚠️ Abonné non trouvé pour ${email}`);
      return NextResponse.json({
        success: true,
        messages: []
      });
    }

    console.log(`📬 Récupération des messages pour ${email} (ID: ${subscriber.id})`);

    // 🔥 Récupérer tous les messages de l'abonné
    const messages = await db.all(`
      SELECT 
        id,
        subject,
        content,
        sent_at,
        read_at,
        CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END as read
      FROM newsletter_messages
      WHERE subscriber_id = ?
      ORDER BY sent_at DESC
    `, [subscriber.id]);

    console.log(`📬 ${messages.length} messages trouvés pour ${email}`);

    return NextResponse.json({
      success: true,
      messages: messages.map(msg => ({
        ...msg,
        read: msg.read === 1
      }))
    });

  } catch (error) {
    console.error('❌ Erreur chargement messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du chargement des messages'
    }, { status: 500 });
  }
}