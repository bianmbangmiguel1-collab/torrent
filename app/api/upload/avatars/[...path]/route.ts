// app/api/uploads/avatars/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Chemin vers le dossier uploads du backend
    const uploadsPath = path.join(
      process.cwd(),
      'torrenttwist-backend',
      'uploads',
      'avatars',
      ...params.path
    );
    
    if (!fs.existsSync(uploadsPath)) {
      // Retourner une image par défaut ou 404
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    const file = fs.readFileSync(uploadsPath);
    const ext = path.extname(uploadsPath);
    const contentType = ext === '.png' ? 'image/png' : 
                        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                        'image/png';

    return new NextResponse(file, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    console.error('Erreur serveur image:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}