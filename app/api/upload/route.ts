// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { uploadImageToSupabase } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'campaigns';

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier', success: false },
        { status: 400 }
      );
    }

    // Générer un nom unique
    const ext = file.name.split('.').pop() || 'bin';
    const uniqueName = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    // Upload vers Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadImageToSupabase(
      uniqueName,
      buffer,
      file.type || 'application/octet-stream'
    );

    console.log(`✅ Fichier uploadé : ${publicUrl}`);

    return NextResponse.json({
      path: publicUrl,
      success: true,
    });
  } catch (error: any) {
    console.error('❌ Erreur upload:', error);
    return NextResponse.json(
      {
        error: error?.message || "Erreur lors de l'upload",
        success: false,
      },
      { status: 500 }
    );
  }
}