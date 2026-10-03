// app/api/admin/products/upload-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { uploadImageToSupabase } from '@/lib/storage'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  }
  return map[mime] || '.jpg'
}

export async function POST(request: NextRequest) {
  console.log('📸 [upload-images] Début de la requête')

  try {
    const adminId = request.headers.get('x-admin-id')
    if (!adminId) {
      console.warn('❌ [upload-images] Header x-admin-id manquant')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    console.log(`✅ [upload-images] Admin ID: ${adminId}`)

    const formData = await request.formData()
    const productId = formData.get('productId') as string
    const files = formData.getAll('images') as File[]

    if (!productId) {
      return NextResponse.json({ error: 'productId est requis' }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 })
    }

    console.log(`📸 [upload-images] ${files.length} images pour le produit ${productId}`)

    const db = await getDB()

    const product = await db.get('SELECT id FROM products WHERE id = ?', [productId])
    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    const existing = await db.get(
      'SELECT COUNT(*) as count FROM product_images WHERE product_id = ?',
      [productId]
    )
    const existingCount = existing?.count ?? 0

    const uploadedImages = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.size > MAX_IMAGE_SIZE) {
        console.warn(`⚠️ Image trop volumineuse : ${file.name}`)
        continue
      }

      if (!ALLOWED_MIME.includes(file.type)) {
        console.warn(`⚠️ Type non autorisé : ${file.type}`)
        continue
      }

      const ext = getExtFromMime(file.type)
      const filename = `${randomUUID()}${ext}`
      const key = `${productId}/${filename}`

      const buffer = Buffer.from(await file.arrayBuffer())
      let publicUrl: string
      try {
        publicUrl = await uploadImageToSupabase(key, buffer, file.type)
      } catch (uploadErr: any) {
        console.error(`❌ Upload Supabase pour ${file.name}:`, uploadErr)
        continue
      }

      const isMain = existingCount === 0 && i === 0 ? 1 : 0

      const result = await db.run(
        `INSERT INTO product_images (product_id, url, alt, position, is_main, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [productId, publicUrl, file.name, existingCount + i, isMain]
      )

      uploadedImages.push({
        id: result.lastID,
        url: publicUrl,
        alt: file.name,
        position: existingCount + i,
        is_main: isMain,
      })
    }

    console.log(`✅ [upload-images] ${uploadedImages.length} images uploadées`)

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      message: `${uploadedImages.length} image(s) uploadée(s) avec succès`,
    })
  } catch (error: any) {
    console.error('❌ [upload-images] Erreur:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload des images: " + error.message },
      { status: 500 }
    )
  }
}