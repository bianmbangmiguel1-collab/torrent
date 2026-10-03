// app/api/uploads/avatars/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    
    // ⭐ Chemin vers le dossier uploads/avatars du backend
    const filePath = path.join(
      process.cwd(),
      'torrenttwist-backend',
      'uploads',
      'avatars',
      filename
    );
    
    console.log('🔍 Recherche du fichier avatar:', filePath);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier non trouvé:', filePath);
      
      // Essayer de trouver dans public/uploads/avatars/ en fallback
      const publicPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', filename);
      if (fs.existsSync(publicPath)) {
        const file = fs.readFileSync(publicPath);
        const ext = path.extname(publicPath);
        const contentType = ext === '.png' ? 'image/png' : 
                           ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                           'image/png';
        return new NextResponse(file, {
          headers: { 
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000'
          },
        });
      }
      
      // Retourner une image par défaut si elle existe
      const defaultPath = path.join(process.cwd(), 'public', 'images', 'default-avatar.png');
      if (fs.existsSync(defaultPath)) {
        const file = fs.readFileSync(defaultPath);
        return new NextResponse(file, {
          headers: { 
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000'
          },
        });
      }
      
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    const file = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const contentType = ext === '.png' ? 'image/png' : 
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                       'image/png';

    return new NextResponse(file, {
      headers: { 
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      },
    });
  } catch (error) {
    console.error('❌ Erreur serveur image:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}