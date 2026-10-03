export const dynamic = 'force-dynamic';

// app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface GenerateInvoiceBody {
  invoice_id: number | string
}

// ============================================================
// GET : Récupérer les factures de l'utilisateur
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié',
        invoices: [] 
      }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token invalide',
        invoices: [] 
      }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non identifié',
        invoices: [] 
      }, { status: 401 })
    }

    const db = await getDB()

    const invoices = await db.all(`
      SELECT 
        o.id,
        o.order_number,
        o.total,
        o.currency,
        o.status,
        o.payment_status,
        o.payment_method,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.address,
        u.city,
        u.country,
        u.phone,
        o.shipping_address,
        o.shipping_city,
        o.shipping_country,
        o.download_token
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.user_id = ? AND o.status IN ('completed', 'confirmed', 'processing')
      ORDER BY o.created_at DESC
    `, [userId])

    for (const invoice of invoices) {
      const items = await db.all(`
        SELECT 
          product_title,
          quantity,
          price,
          total,
          product_file_path,
          product_format
        FROM order_items 
        WHERE order_id = ?
      `, [invoice.id])
      invoice.items = items || []
    }

    const formattedInvoices = invoices.map((inv, index) => ({
      ...inv,
      invoice_number: `INV-${String(index + 1).padStart(4, '0')}-${new Date(inv.created_at).getFullYear()}`,
      invoice_date: inv.created_at,
      due_date: new Date(new Date(inv.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: inv.items?.reduce((sum: number, item: any) => sum + item.total, 0) || inv.total,
      tax: 0,
      total: inv.total,
      currency: inv.currency || 'FCFA'
    }))

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices || []
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/invoices:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur',
      invoices: [] 
    }, { status: 500 })
  }
}

// ============================================================
// POST : Générer une facture PDF
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 })
    }

    const body = (await request.json()) as GenerateInvoiceBody
    const { invoice_id } = body

    if (!invoice_id) {
      return NextResponse.json({ error: 'ID facture requis' }, { status: 400 })
    }

    const db = await getDB()

    // Récupérer les données de la facture
    const invoice = await db.get(`
      SELECT 
        o.id,
        o.order_number,
        o.total,
        o.currency,
        o.status,
        o.payment_status,
        o.payment_method,
        o.created_at,
        u.name as user_name,
        u.email as user_email,
        u.address,
        u.city,
        u.country,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.user_id = ?
    `, [invoice_id, userId])

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    // Récupérer les items
    const items = await db.all(`
      SELECT 
        product_title,
        quantity,
        price,
        total
      FROM order_items 
      WHERE order_id = ?
    `, [invoice_id])

    // 🔥 Générer le PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = height - 50
    const margin = 50
    const lineHeight = 25

    // Fonction pour écrire du texte
    const drawText = (text: string, x: number, yPos: number, size: number = 12, color: any = rgb(0, 0, 0), bold: boolean = false) => {
      const fontToUse = bold ? fontBold : font
      page.drawText(text, {
        x,
        y: yPos,
        size,
        font: fontToUse,
        color,
      })
    }

    // En-tête
    drawText('TORRENTTWIST', margin, y, 24, rgb(0.2, 0.4, 0.8), true)
    y -= 30
    drawText('Facture de commande', margin, y, 16, rgb(0.3, 0.3, 0.3))

    // Ligne séparatrice
    y -= 20
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: width - margin, y: y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 30

    // Numéro de facture
    const invoiceNumber = `INV-${String(invoice.id).padStart(4, '0')}-${new Date(invoice.created_at).getFullYear()}`
    drawText(`Facture N°: ${invoiceNumber}`, margin, y, 14, rgb(0, 0, 0), true)
    y -= lineHeight
    drawText(`Commande N°: ${invoice.order_number}`, margin, y, 12)
    y -= lineHeight
    drawText(`Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`, margin, y, 12)
    y -= 30

    // Informations client
    drawText('INFORMATIONS CLIENT', margin, y, 14, rgb(0.2, 0.4, 0.8), true)
    y -= lineHeight
    drawText(`Nom: ${invoice.user_name || 'Client'}`, margin, y, 12)
    y -= lineHeight
    drawText(`Email: ${invoice.user_email}`, margin, y, 12)
    y -= lineHeight
    if (invoice.phone) drawText(`Téléphone: ${invoice.phone}`, margin, y, 12)
    if (invoice.address) {
      y -= lineHeight
      drawText(`Adresse: ${invoice.address}${invoice.city ? `, ${invoice.city}` : ''}${invoice.country ? `, ${invoice.country}` : ''}`, margin, y, 12)
    }
    y -= 30

    // Ligne séparatrice
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: width - margin, y: y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 30

    // En-tête du tableau
    const col1 = margin
    const col2 = margin + 200
    const col3 = margin + 350
    const col4 = margin + 450

    drawText('PRODUIT', col1, y, 12, rgb(0.2, 0.4, 0.8), true)
    drawText('QUANTITÉ', col2, y, 12, rgb(0.2, 0.4, 0.8), true)
    drawText('PRIX UNITAIRE', col3, y, 12, rgb(0.2, 0.4, 0.8), true)
    drawText('TOTAL', col4, y, 12, rgb(0.2, 0.4, 0.8), true)
    y -= lineHeight

    // Ligne sous l'en-tête
    page.drawLine({
      start: { x: margin, y: y + 10 },
      end: { x: width - margin, y: y + 10 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    y -= 10

    // Articles
    let subtotal = 0
    for (const item of items) {
      const itemTotal = item.price * item.quantity
      subtotal += itemTotal
      drawText(item.product_title.substring(0, 30), col1, y, 11)
      drawText(String(item.quantity), col2, y, 11)
      drawText(`${item.price.toLocaleString()} FCFA`, col3, y, 11)
      drawText(`${itemTotal.toLocaleString()} FCFA`, col4, y, 11)
      y -= lineHeight
      
      if (y < 100) {
        // Nouvelle page si besoin
        const newPage = pdfDoc.addPage([595.28, 841.89])
        // ... continuer sur la nouvelle page
      }
    }

    y -= 20
    page.drawLine({
      start: { x: margin, y: y + 10 },
      end: { x: width - margin, y: y + 10 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    y -= 20

    // Totaux
    const total = invoice.total || subtotal
    drawText(`SOUS-TOTAL:`, col3, y, 12, rgb(0.3, 0.3, 0.3), true)
    drawText(`${subtotal.toLocaleString()} FCFA`, col4, y, 12, rgb(0.3, 0.3, 0.3), true)
    y -= lineHeight
    drawText(`TAXES:`, col3, y, 12, rgb(0.3, 0.3, 0.3), true)
    drawText(`0 FCFA`, col4, y, 12, rgb(0.3, 0.3, 0.3), true)
    y -= 10
    page.drawLine({
      start: { x: col3 - 10, y: y + 10 },
      end: { x: width - margin, y: y + 10 },
      thickness: 2,
      color: rgb(0.2, 0.4, 0.8),
    })
    y -= lineHeight
    drawText(`TOTAL:`, col3, y, 16, rgb(0.2, 0.4, 0.8), true)
    drawText(`${total.toLocaleString()} FCFA`, col4, y, 16, rgb(0.2, 0.4, 0.8), true)
    y -= 40

    // Pied de page
    drawText('Merci pour votre confiance !', margin, y, 12, rgb(0.4, 0.4, 0.4))
    y -= lineHeight
    drawText('© TorrentTwist - Tous droits réservés', margin, y, 10, rgb(0.5, 0.5, 0.5))

    // Générer le PDF
    const pdfBytes = await pdfDoc.save()
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

    return NextResponse.json({
      success: true,
      message: 'Facture générée avec succès',
      pdf: pdfBase64,
      invoice_number: invoiceNumber
    })
    
  } catch (error) {
    console.error('❌ Erreur POST /api/invoices:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}