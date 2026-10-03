// lib/services/invoice.ts
import PDFDocument from 'pdfkit';
import { getDB } from '@/lib/db';
import { put } from '@vercel/blob';

export async function generateInvoicePDF(data: {
  orderNumber: string;
  orderId: number;
  user: { name: string; email: string };
  product: { title: string; price: number };
  quantity: number;
  totalAmount: number;
  date: string;
  paymentDate?: string;
  transactionId?: string;
}): Promise<string> {
  try {
    // Créer le PDF
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // ===== ENTÊTE =====
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a56db')
      .text('TORRENTTWIST', 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Facture de paiement', 50, 80)
      .moveDown();

    // Ligne séparatrice
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, 100)
      .lineTo(545, 100)
      .stroke();

    // ===== INFOS FACTURE =====
    const yStart = 120;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text('N° de facture', 50, yStart)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(`TT-INV-${data.orderNumber}`);

    doc
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text('Date', 50, yStart + 20)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(new Date(data.date).toLocaleDateString('fr-FR'));

    if (data.paymentDate) {
      doc
        .font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text('Date de paiement', 50, yStart + 40)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(new Date(data.paymentDate).toLocaleDateString('fr-FR'));
    }

    // ===== INFOS CLIENT =====
    doc
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text('Client', 350, yStart)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(data.user.name, 350, yStart + 15)
      .text(data.user.email, 350, yStart + 30);

    // ===== DÉTAILS PRODUIT =====
    const tableY = yStart + 80;
    
    // En-tête du tableau
    const col1 = 50;
    const col2 = 300;
    const col3 = 400;
    const col4 = 480;

    doc
      .fillColor('#f3f4f6')
      .rect(col1, tableY, 495, 25)
      .fill();

    doc
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .fontSize(9)
      .text('Produit', col1 + 10, tableY + 6)
      .text('Qté', col2, tableY + 6)
      .text('Prix unitaire', col3, tableY + 6)
      .text('Total', col4, tableY + 6);

    // Ligne du produit
    const rowY = tableY + 30;
    doc
      .font('Helvetica')
      .fillColor('#4b5563')
      .fontSize(10)
      .text(data.product.title, col1 + 10, rowY)
      .text(data.quantity.toString(), col2, rowY)
      .text(`${data.product.price.toLocaleString()} FCFA`, col3, rowY)
      .text(`${data.totalAmount.toLocaleString()} FCFA`, col4, rowY);

    // ===== TOTAL =====
    const totalY = rowY + 40;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(col1, totalY)
      .lineTo(col4 + 50, totalY)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .fontSize(12)
      .text('TOTAL', 350, totalY + 10)
      .font('Helvetica-Bold')
      .fillColor('#1a56db')
      .fontSize(14)
      .text(`${data.totalAmount.toLocaleString()} FCFA`, 430, totalY + 10);

    // ===== PIED DE PAGE =====
    const footerY = 700;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text('TorrentTwist - Tous droits réservés', 50, footerY + 10, { align: 'center' })
      .text('Cette facture est générée automatiquement', { align: 'center' });

    if (data.transactionId) {
      doc
        .text(`Transaction ID: ${data.transactionId}`, { align: 'center' });
    }

    // ===== FINALISER =====
    doc.end();

    // Attendre que le PDF soit généré
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Uploader sur Vercel Blob ou autre stockage
    const filename = `invoices/TT-INV-${data.orderNumber}.pdf`;
    const blob = await put(filename, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf'
    });

    return blob.url;

  } catch (error) {
    console.error('❌ Erreur génération facture:', error);
    throw error;
  }
}