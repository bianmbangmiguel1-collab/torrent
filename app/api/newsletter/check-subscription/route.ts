// app/api/newsletter/check-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface CheckSubscriptionBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email } =
      (await request.json()) as CheckSubscriptionBody;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const db = await getDB();
    const subscriber = await db.get(
      'SELECT status FROM newsletter_subscribers WHERE email = ? AND status = "active" AND opt_in = 1',
      [email]
    );

    return NextResponse.json({
      subscribed: !!subscriber
    });

  } catch (error) {
    console.error('Erreur vérification abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}