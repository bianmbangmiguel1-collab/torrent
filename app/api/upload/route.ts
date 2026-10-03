import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const folder = formData.get('folder') as string || 'campaigns';
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
  const ext = path.extname(file.name);
  const basename = path.basename(file.name, ext);
  const timestamp = Date.now();
  const safeName = `${basename}-${timestamp}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return NextResponse.json({ path: `/uploads/${folder}/${safeName}`, success: true });
}