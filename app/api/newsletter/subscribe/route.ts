// app/api/newsletter/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface SubscribeNewsletterBody {
  email: string;
  name?: string;
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeNewsletterBody;
    const { email, name, source = 'website' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const db = await getDB();

    // Vérifier si l'email existe déjà
    const existing = await db.get(
      'SELECT id, status FROM newsletter_subscribers WHERE email = ?',
      [email]
    );

    if (existing) {
      if (existing.status === 'inactive') {
        // Réactiver l'abonné
        await db.run(
          `UPDATE newsletter_subscribers 
           SET status = 'active', opt_in = 1, name = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [name || null, existing.id]
        );
        return NextResponse.json({ 
          success: true, 
          message: 'Abonné réactivé',
          subscriber: { id: existing.id, email, name }
        });
      }
      return NextResponse.json({ 
        error: 'Cet email est déjà inscrit' 
      }, { status: 400 });
    }

    // Créer un nouvel abonné
    const result = await db.run(
      `INSERT INTO newsletter_subscribers 
       (email, name, source, status, opt_in, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [email, name || null, source]
    );

    return NextResponse.json({
      success: true,
      message: 'Inscription réussie',
      subscriber: { id: result.lastID, email, name }
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur inscription newsletter:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}