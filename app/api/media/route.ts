export const dynamic = 'force-dynamic';

// app/api/media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDB } from '@/lib/db';
import {
  uploadImageToSupabase,
  deleteImageFromSupabase,
  extractKeyFromPublicUrl,
} from '@/lib/storage';

// ------------------------------------------------------------
// GET : Récupérer la liste des médias
// ------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const media = await db.all(`
      SELECT id, name, file_path, file_type, mime_type, size, dimensions, alt, created_at
      FROM media_library
      ORDER BY created_at DESC
    `);

    return NextResponse.json(media);
  } catch (error) {
    console.error('Erreur GET /api/media:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des médias' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// POST : Upload d'un fichier média
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = (formData.get('name') as string) || null;
    const alt = (formData.get('alt') as string) || null;
    const campaignId = (formData.get('campaign_id') as string) || null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté' },
        { status: 400 }
      );
    }

    // Vérifier la taille (10 Mo max)
    const maxSize = 10 * 1024 * 1024; // 10 Mo
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 Mo)' },
        { status: 400 }
      );
    }

    // Générer un nom unique
    const ext = file.name.split('.').pop() || 'bin';
    const uniqueName = `media/${Date.now()}-${randomUUID()}.${ext}`;

    // Upload vers Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadImageToSupabase(
      uniqueName,
      buffer,
      file.type || 'application/octet-stream'
    );

    // Déterminer le type de média
    let fileType = 'other';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type.startsWith('audio/')) fileType = 'audio';

    // Insérer dans la base de données
    const db = await getDB();
    const result = await db.run(
      `INSERT INTO media_library (name, file_path, file_type, mime_type, size, alt, campaign_id, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name || file.name,
        publicUrl,
        fileType,
        file.type,
        file.size,
        alt || null,
        campaignId ? parseInt(campaignId) : null,
        1, // admin user id par défaut
      ]
    );

    return NextResponse.json({
      success: true,
      id: result.lastID,
      path: publicUrl,
      name: name || file.name,
      file_type: fileType,
    });
  } catch (error: any) {
    console.error('Erreur POST /api/media:', error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'upload du fichier" },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// DELETE : Supprimer un média
// ------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du média requis' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const media = await db.get<{ file_path: string }>(
      'SELECT file_path FROM media_library WHERE id = ?',
      [parseInt(id)]
    );

    if (!media) {
      return NextResponse.json(
        { error: 'Média non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le fichier sur Supabase (si c'est une URL Supabase)
    if (media.file_path && media.file_path.includes('supabase')) {
      const oldKey = extractKeyFromPublicUrl(media.file_path);
      if (oldKey) {
        try {
          await deleteImageFromSupabase(oldKey);
        } catch (err) {
          console.warn('⚠️ Suppression Supabase échouée:', err);
        }
      }
    }

    // Supprimer l'entrée en base
    await db.run('DELETE FROM media_library WHERE id = ?', [parseInt(id)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/media:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du média' },
      { status: 500 }
    );
  }
}