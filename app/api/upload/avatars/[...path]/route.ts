// app/api/uploads/avatars/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Image par défaut (SVG inline, pas de dépendance fs)
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#e5e7eb"/>
  <circle cx="100" cy="75" r="35" fill="#9ca3af"/>
  <path d="M100 120c-40 0-70 25-70 55v25h140v-25c0-30-30-55-70-55z" fill="#9ca3af"/>
</svg>`;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filename = params.path?.join('/') || 'unknown';

    console.log(
      `ℹ️ Requête legacy avatar (path multiple): ${filename} — redirection vers default`
    );

    // Sur Cloudflare Workers, le fs local n'existe pas.
    // Les avatars sont maintenant servis directement depuis Supabase Storage.
    // On retourne l'image par défaut (SVG inline).
    return new NextResponse(DEFAULT_AVATAR_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('❌ Erreur serveur avatar (path multiple):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}