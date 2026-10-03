import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = Number(params.id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const cookieStore = cookies();
  let sessionId = cookieStore.get('tt_sid')?.value;
  if (!sessionId) {
    sessionId = randomBytes(16).toString('hex');
    cookieStore.set('tt_sid', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  try {
    const db = await getDB();
    await db.run(
      `INSERT INTO product_views (product_id, session_id, source, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [productId, sessionId, req.headers.get('referer') || null]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}