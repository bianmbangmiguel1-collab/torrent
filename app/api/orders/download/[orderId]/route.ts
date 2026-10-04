// app/api/orders/download/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { getDownloadUrl } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    // ─── Auth (cookie en priorité) ───
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const orderId = parseInt(params.orderId, 10)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const db = await getDB()

    // ─── Récupérer la commande + produit ───
    const order = await db.get<any>(
      `SELECT
         o.id, o.user_id, o.product_id,
         o.payment_status, o.status,
         o.download_count, o.download_limit, o.download_expires_at,
         p.title   AS product_title,
         p.file_path,
         p.file_name,
         p.file_format,
         p.download_url
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.id = ? AND o.user_id = ?`,
      [orderId, user.id],
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 },
      )
    }

    // ─── Vérifier le paiement (paid OU completed) ───
    const isPaid =
      String(order.payment_status).toLowerCase() === 'paid' ||
      String(order.status).toLowerCase() === 'completed'

    if (!isPaid) {
      return NextResponse.json(
        { error: 'Paiement non confirmé' },
        { status: 402 },
      )
    }

    // ─── Vérifier la limite de téléchargements ───
    if (
      order.download_limit > 0 &&
      order.download_count >= order.download_limit
    ) {
      return NextResponse.json(
        { error: 'Limite de téléchargements atteinte' },
        { status: 429 },
      )
    }

    // ─── Vérifier l'expiration ───
    if (
      order.download_expires_at &&
      new Date(order.download_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: 'Lien de téléchargement expiré' },
        { status: 410 },
      )
    }

    // ─── Nom du fichier ───
    const fileName =
      order.file_name ||
      `${order.product_title || 'produit'}.${order.file_format || 'zip'}`

    // ─── Cas A : fichier via file_path (Supabase Storage) ───
    if (order.file_path) {
      try {
        // Générer une URL signée valide 5 minutes
        const signedUrl = await getDownloadUrl(order.file_path, 300, fileName)

        // Incrémenter le compteur
        await db.run(
          `UPDATE orders SET download_count = download_count + 1 WHERE id = ?`,
          [orderId],
        )

        console.log(`✅ Téléchargement commande ${orderId}: ${order.file_path}`)

        // Rediriger vers Supabase (pas de fs)
        return NextResponse.redirect(signedUrl)
      } catch (storageErr: any) {
        console.warn(
          `⚠️ Fichier Supabase introuvable pour order ${orderId}:`,
          storageErr.message,
        )
        // On continue pour essayer download_url
      }
    }

    // ─── Cas B : URL externe via download_url ───
    if (order.download_url) {
      // URL HTTP(S) → redirection directe
      if (/^https?:\/\//i.test(order.download_url)) {
        await db.run(
          `UPDATE orders SET download_count = download_count + 1 WHERE id = ?`,
          [orderId],
        )
        return NextResponse.redirect(order.download_url)
      }

      // Chemin local → traiter comme clé Supabase
      try {
        const signedUrl = await getDownloadUrl(
          order.download_url,
          300,
          fileName,
        )

        await db.run(
          `UPDATE orders SET download_count = download_count + 1 WHERE id = ?`,
          [orderId],
        )

        return NextResponse.redirect(signedUrl)
      } catch (storageErr: any) {
        console.warn(
          `⚠️ Fichier Supabase introuvable pour download_url ${orderId}:`,
          storageErr.message,
        )
      }
    }

    // ─── Aucun fichier disponible ───
    return NextResponse.json(
      { error: 'Aucun fichier disponible pour ce produit' },
      { status: 404 },
    )
  } catch (error: any) {
    console.error('❌ Erreur téléchargement:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 },
    )
  }
}