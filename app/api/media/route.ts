export const dynamic = 'force-dynamic';

// app/api/media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDB } from '@/lib/db';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';

// ------------------------------------------------------------
// GET : Récupérer la liste des médias
// ------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    // Vérification d'authentification (optionnel)
    // const session = await getServerSession(authOptions);
    // if (!session || (session.user as any)?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

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
    // Vérification d'authentification (optionnel)
    // const session = await getServerSession(authOptions);
    // if (!session || (session.user as any)?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string || null;
    const alt = formData.get('alt') as string || null;
    const campaignId = formData.get('campaign_id') as string || null;

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
    const ext = path.extname(file.name);
    const basename = path.basename(file.name, ext);
    const timestamp = Date.now();
    const safeName = `${basename}-${timestamp}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Chemin relatif pour la base de données et l'URL
    const relativePath = `/uploads/media/${safeName}`;

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
        relativePath,
        fileType,
        file.type,
        file.size,
        alt || null,
        campaignId ? parseInt(campaignId) : null,
        1, // admin user id par défaut (à remplacer par l'ID de l'utilisateur connecté)
      ]
    );

    return NextResponse.json({
      success: true,
      id: result.lastID,
      path: relativePath,
      name: name || file.name,
      file_type: fileType,
    });
  } catch (error) {
    console.error('Erreur POST /api/media:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du fichier' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// DELETE : Supprimer un média
// ------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    // Vérification d'authentification
    // const session = await getServerSession(authOptions);
    // if (!session || (session.user as any)?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du média requis' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const media = await db.get('SELECT file_path FROM media_library WHERE id = ?', [parseInt(id)]);

    if (!media) {
      return NextResponse.json(
        { error: 'Média non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le fichier physique
    const filePath = path.join(process.cwd(), 'public', media.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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